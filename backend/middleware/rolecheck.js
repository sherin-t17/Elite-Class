exports.teacherOnly = (req, res, next) => {
  if (req.user.role !== 'teacher') {
    return res.status(403).json({ success: false, message: 'Teacher access only' });
  }
  next();
};

exports.studentOnly = (req, res, next) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({ success: false, message: 'Student access only' });
  }
  next();
};
