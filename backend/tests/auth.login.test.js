const express = require('express');
const request = require('supertest');
const authRoutes = require('../routes/auth');
const User = require('../models/User');

jest.mock('../models/User');

describe('POST /api/auth/login', () => {
  let app;

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_EXPIRES_IN = '1h';
  });

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
    jest.clearAllMocks();
  });

  it('returns 401 when user does not exist', async () => {
    User.findOne.mockResolvedValue(null);

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'missing@example.com', password: '123456' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message: 'Invalid credentials'
    });
    expect(User.findOne).toHaveBeenCalledWith({ email: 'missing@example.com' });
  });

  it('returns 401 when password is incorrect', async () => {
    const mockUser = {
      comparePassword: jest.fn().mockResolvedValue(false),
      authProvider: 'local'
    };
    User.findOne.mockResolvedValue(mockUser);

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'student@example.com', password: 'wrong-password' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message: 'Invalid credentials'
    });
    expect(mockUser.comparePassword).toHaveBeenCalledWith('wrong-password');
  });

  it('returns token and user payload when credentials are valid', async () => {
    const mockUser = {
      _id: '65f2a6f6d2f4c0c000000001',
      name: 'Test Student',
      email: 'student@example.com',
      role: 'student',
      xp: 20,
      level: 'Initiate',
      streak: 1,
      rank: 10,
      color: '#4ECDC4',
      initials: 'TS',
      heroRole: 'mage',
      attendance: 95,
      tasksCompleted: 6,
      regNo: 'REG1001',
      year: '2',
      dept: 'CSE',
      section: 'A',
      motivationQuote: '',
      profileImageUrl: '',
      comparePassword: jest.fn().mockResolvedValue(true)
    };
    User.findOne.mockResolvedValue(mockUser);

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'student@example.com', password: 'correct-password' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.token).toEqual(expect.any(String));
    expect(response.body.user).toMatchObject({
      id: mockUser._id,
      name: mockUser.name,
      email: mockUser.email,
      role: mockUser.role
    });
  });
});
