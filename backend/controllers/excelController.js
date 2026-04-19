const Workbook = require('../models/Workbook');
const WorkbookSheetLegacy = require('../models/WorkbookSheet');
const User = require('../models/User');
const MonthTask = require('../models/MonthTask');
const MonthTaskBatch = require('../models/MonthTaskBatch');
const MonthTaskSubmission = require('../models/MonthTaskSubmission');

function slugify(value, fallback = 'sheet') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || fallback;
}

function normalizeWorkbookKey(value) {
  return slugify(value || 'month-task-workbook', 'month-task-workbook');
}

function createCell(value = '', formula = '') {
  return {
    value: String(value ?? ''),
    formula: String(formula ?? '')
  };
}

function createBlankCells(rows = 30, cols = 12) {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => createCell()));
}

function normalizeSheetCells(rawCells, rowCount, columnCount) {
  const rows = Math.max(1, Math.min(Number(rowCount || 30), 500));
  const cols = Math.max(1, Math.min(Number(columnCount || 12), 100));
  const source = Array.isArray(rawCells) ? rawCells : [];

  return Array.from({ length: rows }, (_, rowIndex) => {
    const sourceRow = Array.isArray(source[rowIndex]) ? source[rowIndex] : [];
    return Array.from({ length: cols }, (_, colIndex) => {
      const sourceCell = sourceRow[colIndex];
      if (sourceCell && typeof sourceCell === 'object' && !Array.isArray(sourceCell)) {
        return createCell(sourceCell.value, sourceCell.formula);
      }
      return createCell(sourceCell);
    });
  });
}

function defaultSheets() {
  return [
    {
      id: 'sheet-1',
      key: 'sheet-1',
      title: 'Sheet1',
      type: 'grid',
      rowCount: 30,
      columnCount: 12,
      columnWidths: [],
      cells: createBlankCells(30, 12)
    },
    {
      id: 'track-sheet',
      key: 'track-sheet',
      title: 'Track Sheet',
      type: 'track',
      rowCount: 1,
      columnCount: 5,
      columnWidths: [180, 220, 100, 140, 140],
      cells: [[
        createCell('Student'),
        createCell('Task'),
        createCell('Score'),
        createCell('Status'),
        createCell('Date')
      ]]
    },
    {
      id: 'department-sheet',
      key: 'department-sheet',
      title: 'Department Sheet',
      type: 'department',
      rowCount: 1,
      columnCount: 5,
      columnWidths: [180, 160, 180, 120, 180],
      cells: [[
        createCell('Register No'),
        createCell('Department'),
        createCell('Student Name'),
        createCell('Section'),
        createCell('Year')
      ]]
    }
  ];
}

function normalizeSheetForClient(sheet, canEdit, editableByStudent) {
  return {
    id: sheet.id,
    key: sheet.key,
    title: sheet.title,
    type: sheet.type || 'grid',
    rowCount: sheet.rowCount || sheet.cells?.length || 1,
    columnCount: sheet.columnCount || sheet.cells?.[0]?.length || 1,
    columnWidths: Array.isArray(sheet.columnWidths) ? sheet.columnWidths : [],
    cells: normalizeSheetCells(sheet.cells, sheet.rowCount, sheet.columnCount),
    canEdit,
    studentEditable: editableByStudent
  };
}

function normalizeWorkbookForClient(workbook, req) {
  const isTeacher = req.user.role === 'teacher';
  const permissions = workbook.permissions || { allowStudentEditing: false, editableSheetIds: [] };
  return {
    key: workbook.key,
    title: workbook.title,
    permissions: {
      allowStudentEditing: Boolean(permissions.allowStudentEditing),
      editableSheetIds: Array.isArray(permissions.editableSheetIds) ? permissions.editableSheetIds : []
    },
    canManagePermissions: isTeacher,
    sheets: (workbook.sheets || []).map((sheet) => {
      const editableByStudent = Boolean(permissions.allowStudentEditing)
        && (
          !(permissions.editableSheetIds || []).length
          || permissions.editableSheetIds.includes(sheet.id)
        )
        && sheet.type === 'grid';
      return normalizeSheetForClient(sheet, isTeacher || editableByStudent, editableByStudent);
    }),
    updatedAt: workbook.updatedAt
  };
}

async function migrateLegacySheets(workbookKey) {
  const legacySheets = await WorkbookSheetLegacy.find({
    key: new RegExp(`^${workbookKey}(?:::.+)?$`, 'i')
  }).sort({ createdAt: 1, key: 1 });

  if (!legacySheets.length) return null;

  const sheets = legacySheets.map((sheet, index) => {
    const title = String(sheet.title || `Sheet${index + 1}`).trim() || `Sheet${index + 1}`;
    const key = index === 0 ? `sheet-${index + 1}` : slugify(title, `sheet-${index + 1}`);
    const cells = normalizeSheetCells(
      sheet.cells,
      Math.max(30, Array.isArray(sheet.cells) ? sheet.cells.length : 30),
      Math.max(
        12,
        ...(Array.isArray(sheet.cells) ? sheet.cells : []).map((row) => Array.isArray(row) ? row.length : 0)
      )
    );

    return {
      id: key,
      key,
      title: title.replace(/\s+/g, '') === title ? title : title,
      type: 'grid',
      rowCount: cells.length,
      columnCount: cells[0]?.length || 12,
      columnWidths: [],
      cells
    };
  });

  return Workbook.create({
    key: workbookKey,
    title: 'Month Task Workbook',
    sheets: [
      ...sheets,
      ...defaultSheets().filter((sheet) => ['track-sheet', 'department-sheet'].includes(sheet.id))
    ],
    permissions: { allowStudentEditing: false, editableSheetIds: [] }
  });
}

async function getActiveBatchId() {
  const batch = await MonthTaskBatch.findOne().sort({ year: -1, createdAt: -1 }).lean();
  return batch?._id || null;
}

async function buildTrackSheet() {
  const activeBatchId = await getActiveBatchId();
  const header = ['Student', 'Task', 'Score', 'Status', 'Date'];

  if (!activeBatchId) {
    return {
      id: 'track-sheet',
      key: 'track-sheet',
      title: 'Track Sheet',
      type: 'track',
      rowCount: 12,
      columnCount: header.length,
      columnWidths: [180, 220, 100, 140, 140],
      cells: [header.map((value) => createCell(value)), ...Array.from({ length: 11 }, () => header.map(() => createCell()))]
    };
  }

  const submissions = await MonthTaskSubmission.find({ batch: activeBatchId })
    .populate('student', 'name')
    .populate('task', 'title')
    .sort({ updatedAt: -1 })
    .lean();

  const rows = submissions.length
    ? submissions.map((entry) => [
        createCell(entry.student?.name || 'Student'),
        createCell(entry.task?.title || 'Task'),
        createCell(entry.score || 0),
        createCell(entry.status || 'not_started'),
        createCell(entry.date || '')
      ])
    : Array.from({ length: 8 }, () => header.map(() => createCell()));

  return {
    id: 'track-sheet',
    key: 'track-sheet',
    title: 'Track Sheet',
    type: 'track',
    rowCount: rows.length + 1,
    columnCount: header.length,
    columnWidths: [180, 220, 100, 140, 140],
    cells: [header.map((value) => createCell(value)), ...rows]
  };
}

async function buildDepartmentSheet() {
  const students = await User.find({ role: 'student' })
    .sort({ dept: 1, name: 1 })
    .select('regNo dept name section year')
    .lean();

  const header = ['Register No', 'Department', 'Student Name', 'Section', 'Year'];
  const rows = students.length
    ? students.map((student) => [
        createCell(student.regNo || ''),
        createCell(student.dept || ''),
        createCell(student.name || ''),
        createCell(student.section || ''),
        createCell(student.year || '')
      ])
    : Array.from({ length: 8 }, () => header.map(() => createCell()));

  return {
    id: 'department-sheet',
    key: 'department-sheet',
    title: 'Department Sheet',
    type: 'department',
    rowCount: rows.length + 1,
    columnCount: header.length,
    columnWidths: [180, 160, 180, 120, 180],
    cells: [header.map((value) => createCell(value)), ...rows]
  };
}

async function syncSpecialSheets(workbook) {
  const trackSheet = await buildTrackSheet();
  const departmentSheet = await buildDepartmentSheet();
  const nextSheets = [];
  let hasTrack = false;
  let hasDepartment = false;

  for (const sheet of workbook.sheets || []) {
    if (sheet.id === 'track-sheet') {
      nextSheets.push(trackSheet);
      hasTrack = true;
      continue;
    }
    if (sheet.id === 'department-sheet') {
      nextSheets.push(departmentSheet);
      hasDepartment = true;
      continue;
    }
    nextSheets.push(sheet);
  }

  if (!hasTrack) nextSheets.push(trackSheet);
  if (!hasDepartment) nextSheets.push(departmentSheet);

  workbook.sheets = nextSheets;
  return workbook;
}

async function ensureWorkbook(workbookKey) {
  let workbook = await Workbook.findOne({ key: workbookKey });
  if (!workbook) {
    workbook = await migrateLegacySheets(workbookKey);
  }
  if (!workbook) {
    workbook = await Workbook.create({
      key: workbookKey,
      title: 'Month Task Workbook',
      sheets: defaultSheets(),
      permissions: { allowStudentEditing: false, editableSheetIds: [] }
    });
  }

  await syncSpecialSheets(workbook);

  if (!(workbook.sheets || []).some((sheet) => sheet.id === 'sheet-1')) {
    workbook.sheets.unshift(defaultSheets()[0]);
  }

  return workbook;
}

function findSheet(workbook, sheetId) {
  return (workbook.sheets || []).find((sheet) => sheet.id === sheetId);
}

function assertSheetEditPermission(req, workbook, sheet) {
  if (req.user.role === 'teacher') return;
  const permissions = workbook.permissions || {};
  const editableIds = Array.isArray(permissions.editableSheetIds) ? permissions.editableSheetIds : [];
  const allowed = Boolean(permissions.allowStudentEditing)
    && sheet.type === 'grid'
    && (!editableIds.length || editableIds.includes(sheet.id));

  if (!allowed) {
    const error = new Error('Student editing is disabled for this sheet.');
    error.statusCode = 403;
    throw error;
  }
}

async function applyDepartmentSheetEdits(sheet) {
  const rows = (sheet.cells || []).slice(1);
  for (const row of rows) {
    const regNo = String(row?.[0]?.value || '').trim();
    if (!regNo) continue;
    await User.updateOne(
      { regNo },
      {
        $set: {
          dept: String(row?.[1]?.value || '').trim(),
          section: String(row?.[3]?.value || '').trim(),
          year: String(row?.[4]?.value || '').trim()
        }
      }
    );
  }
}

async function applyTrackSheetEdits(sheet) {
  const activeBatchId = await getActiveBatchId();
  if (!activeBatchId) return;

  const rows = (sheet.cells || []).slice(1);
  for (const row of rows) {
    const studentName = String(row?.[0]?.value || '').trim();
    const taskTitle = String(row?.[1]?.value || '').trim();
    const score = Number(row?.[2]?.value || 0);
    const status = String(row?.[3]?.value || '').trim().toLowerCase();
    const date = String(row?.[4]?.value || '').trim();
    if (!studentName || !taskTitle) continue;

    const [student, task] = await Promise.all([
      User.findOne({ role: 'student', name: studentName }).select('_id'),
      MonthTask.findOne({ batch: activeBatchId, title: taskTitle }).select('_id batch')
    ]);
    if (!student || !task) continue;

    const allowedStatus = ['approved', 'failed', 'submitted', 'self_declared', 'in_progress', 'not_started'];
    const nextStatus = allowedStatus.includes(status) ? status : 'submitted';
    const submissionDate = /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? date
      : new Date().toISOString().split('T')[0];

    await MonthTaskSubmission.findOneAndUpdate(
      { student: student._id, task: task._id, date: submissionDate },
      {
        $set: {
          batch: task.batch,
          score,
          status: nextStatus,
          date: submissionDate,
          approvedAt: ['approved', 'failed'].includes(nextStatus) ? new Date() : null
        },
        $setOnInsert: {
          startedAt: new Date(),
          submittedAt: new Date()
        }
      },
      { upsert: true, new: true }
    );
  }
}

exports.getWorkbook = async (req, res) => {
  try {
    const workbookKey = normalizeWorkbookKey(req.params.workbookKey || req.query.workbookKey);
    const workbook = await ensureWorkbook(workbookKey);
    await workbook.save();
    res.json({ success: true, data: normalizeWorkbookForClient(workbook, req) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createSheet = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ success: false, message: 'Only teachers can create sheets.' });
    }

    const workbookKey = normalizeWorkbookKey(req.params.workbookKey || req.body.workbookKey);
    const workbook = await ensureWorkbook(workbookKey);
    const index = (workbook.sheets || []).filter((sheet) => sheet.type === 'grid').length + 1;
    const title = String(req.body.title || `Sheet${index}`).trim() || `Sheet${index}`;
    let key = slugify(title, `sheet-${index}`);
    let counter = index;

    while ((workbook.sheets || []).some((sheet) => sheet.id === key || sheet.key === key)) {
      counter += 1;
      key = `sheet-${counter}`;
    }

    workbook.sheets.push({
      id: key,
      key,
      title,
      type: 'grid',
      rowCount: 30,
      columnCount: 12,
      columnWidths: [],
      cells: createBlankCells(30, 12)
    });
    workbook.updatedBy = req.user.id;
    await workbook.save();

    const sheet = findSheet(workbook, key);
    res.status(201).json({
      success: true,
      data: normalizeSheetForClient(sheet, true, true)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateSheet = async (req, res) => {
  try {
    const workbookKey = normalizeWorkbookKey(req.params.workbookKey || req.body.workbookKey);
    const sheetId = String(req.params.sheetId || '').trim();
    const workbook = await ensureWorkbook(workbookKey);
    const sheet = findSheet(workbook, sheetId);

    if (!sheet) {
      return res.status(404).json({ success: false, message: 'Sheet not found.' });
    }

    assertSheetEditPermission(req, workbook, sheet);

    if (req.body.title && sheet.type === 'grid') {
      sheet.title = String(req.body.title).trim() || sheet.title;
    }

    const rowCount = Math.max(1, Math.min(Number(req.body.rowCount || sheet.rowCount || 30), 500));
    const columnCount = Math.max(1, Math.min(Number(req.body.columnCount || sheet.columnCount || 12), 100));
    sheet.rowCount = rowCount;
    sheet.columnCount = columnCount;
    sheet.columnWidths = Array.isArray(req.body.columnWidths)
      ? req.body.columnWidths.slice(0, columnCount).map((value) => Math.max(60, Math.min(Number(value || 120), 400)))
      : (sheet.columnWidths || []);
    sheet.cells = normalizeSheetCells(req.body.cells, rowCount, columnCount);

    if (sheet.id === 'department-sheet') {
      await applyDepartmentSheetEdits(sheet);
    }
    if (sheet.id === 'track-sheet') {
      await applyTrackSheetEdits(sheet);
    }

    workbook.updatedBy = req.user.id;
    await syncSpecialSheets(workbook);
    await workbook.save();

    const savedSheet = findSheet(workbook, sheet.id);
    const editableIds = workbook.permissions?.editableSheetIds || [];
    const studentEditable = Boolean(workbook.permissions?.allowStudentEditing)
      && (!editableIds.length || editableIds.includes(savedSheet.id))
      && savedSheet.type === 'grid';
    res.json({
      success: true,
      data: normalizeSheetForClient(savedSheet, req.user.role === 'teacher' || studentEditable, studentEditable)
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

exports.deleteSheet = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ success: false, message: 'Only teachers can delete sheets.' });
    }

    const workbookKey = normalizeWorkbookKey(req.params.workbookKey);
    const sheetId = String(req.params.sheetId || '').trim();
    const workbook = await ensureWorkbook(workbookKey);
    const gridSheets = (workbook.sheets || []).filter((sheet) => sheet.type === 'grid');
    const sheet = findSheet(workbook, sheetId);

    if (!sheet) {
      return res.status(404).json({ success: false, message: 'Sheet not found.' });
    }
    if (sheet.type !== 'grid') {
      return res.status(400).json({ success: false, message: 'System sheets cannot be deleted.' });
    }
    if (gridSheets.length <= 1) {
      return res.status(400).json({ success: false, message: 'At least one editable sheet must remain.' });
    }

    workbook.sheets = workbook.sheets.filter((entry) => entry.id !== sheetId);
    workbook.permissions.editableSheetIds = (workbook.permissions.editableSheetIds || []).filter((id) => id !== sheetId);
    workbook.updatedBy = req.user.id;
    await workbook.save();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updatePermissions = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ success: false, message: 'Only teachers can update permissions.' });
    }

    const workbookKey = normalizeWorkbookKey(req.params.workbookKey);
    const workbook = await ensureWorkbook(workbookKey);
    const editableSheetIds = Array.isArray(req.body.editableSheetIds)
      ? req.body.editableSheetIds.filter((id) => (workbook.sheets || []).some((sheet) => sheet.id === id && sheet.type === 'grid'))
      : [];

    workbook.permissions = {
      allowStudentEditing: Boolean(req.body.allowStudentEditing),
      editableSheetIds
    };
    workbook.updatedBy = req.user.id;
    await workbook.save();
    res.json({ success: true, data: normalizeWorkbookForClient(workbook, req) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
