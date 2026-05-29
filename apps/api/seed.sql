-- Seed data for local development
-- Run with: npx wrangler d1 execute capsule --local --file=seed.sql

INSERT OR IGNORE INTO universities (id, name, slug, domain, view_access) VALUES
('uni-1', 'University of Dhaka', 'du', 'du.ac.bd', 'PUBLIC'),
('uni-2', 'Bangladesh University of Engineering and Technology', 'buet', 'buet.ac.bd', 'PUBLIC');

INSERT OR IGNORE INTO majors (id, university_id, name, code) VALUES
('maj-1', 'uni-1', 'Computer Science and Engineering', 'CSE'),
('maj-2', 'uni-1', 'Physics', 'PHY'),
('maj-3', 'uni-2', 'Computer Science and Engineering', 'CSE');

INSERT OR IGNORE INTO semesters (id, major_id, number, label) VALUES
('sem-1', 'maj-1', 1, '1st Year 1st Semester'),
('sem-2', 'maj-1', 2, '1st Year 2nd Semester'),
('sem-3', 'maj-1', 3, '2nd Year 1st Semester');

INSERT OR IGNORE INTO subjects (id, semester_id, name, code) VALUES
('sub-1', 'sem-1', 'Structured Programming Language', 'CSE-101'),
('sub-2', 'sem-1', 'Discrete Mathematics', 'CSE-103'),
('sub-3', 'sem-2', 'Data Structures', 'CSE-201'),
('sub-4', 'sem-2', 'Object Oriented Programming', 'CSE-203');
