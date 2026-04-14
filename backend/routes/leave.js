const express = require('express');
const LeaveRequest = require('../models/LeaveRequest');
const { verifyToken } = require('../middleware/auth');
const { teacherOnly, studentOnly } = require('../middleware/roleCheck');
const router = express.Router();

// Get all leave requests
router.get('/', verifyToken, teacherOnly, async (req, res) => {
  try {
    const query = req.query.status ? { status: req.query.status } : {};
    const requests = await LeaveRequest.find(query)
      .populate('student')
      .populate('reviewedBy');
    res.json({ success: true, data: requests });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get my leave requests
router.get('/my', verifyToken, studentOnly, async (req, res) => {
  try {
    const requests = await LeaveRequest.find({ student: req.user.id });
    res.json({ success: true, data: requests });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Submit leave request
router.post('/', verifyToken, studentOnly, async (req, res) => {
  try {
    const { type, reason, date } = req.body;
    const request = new LeaveRequest({
      student: req.user.id,
      type,
      reason,
      date
    });
    await request.save();
    res.status(201).json({ success: true, data: request });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Approve request
router.put('/:id/approve', verifyToken, teacherOnly, async (req, res) => {
  try {
    const request = await LeaveRequest.findByIdAndUpdate(
      req.params.id,
      { status: 'approved', reviewedBy: req.user.id, reviewedAt: new Date() },
      { new: true }
    );
    res.json({ success: true, data: request });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Reject request
router.put('/:id/reject', verifyToken, teacherOnly, async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    const request = await LeaveRequest.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected', rejectionReason, reviewedBy: req.user.id, reviewedAt: new Date() },
      { new: true }
    );
    res.json({ success: true, data: request });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;