-- ========================================
-- Organization Table
-- ========================================
CREATE TABLE organization (
    organization_id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    logo_filename VARCHAR(255) NOT NULL
);

-- ========================================
-- Insert sample data: Organizations
-- ========================================
INSERT INTO organization (name, description, contact_email, logo_filename)
VALUES
('BrightFuture Builders', 'A nonprofit focused on improving community infrastructure through sustainable construction projects.', 'info@brightfuturebuilders.org', 'brightfuture-logo.png'),
('GreenHarvest Growers', 'An urban farming collective promoting food sustainability and education in local neighborhoods.', 'contact@greenharvest.org', 'greenharvest-logo.png'),
('UnityServe Volunteers', 'A volunteer coordination group supporting local charities and service initiatives.', 'hello@unityserve.org', 'unityserve-logo.png');

SELECT * FROM organization;

-- ========================================
-- Project Table
-- ========================================
CREATE TABLE project (
    project_id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organization(organization_id),
    name VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    event_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    recurrence VARCHAR(100),
    location VARCHAR(255) NOT NULL,
    volunteers_needed INTEGER NOT NULL
);

SELECT * FROM project;

-- ========================================
-- Insert sample data: Projects
-- ========================================
INSERT INTO project (organization_id, name, description, category, event_date, start_time, end_time, recurrence, location, volunteers_needed)
VALUES
(
    (SELECT organization_id FROM organization WHERE name = 'GreenHarvest Growers'),
    'Park Cleanup',
    'Join us to clean up local parks and make them beautiful. We will collect litter, clear trails, and mulch garden beds. Gloves, bags, and tools are provided.',
    'Environmental',
    '2026-11-14', '09:00', '12:00', NULL,
    'Riverside Community Park, main pavilion',
    25
),
(
    (SELECT organization_id FROM organization WHERE name = 'UnityServe Volunteers'),
    'Food Drive',
    'Help collect and distribute food to those in need. Volunteers will sort donations, pack family boxes, and staff the pickup line at the community center.',
    'Community Service',
    '2026-11-21', '10:00', '14:00', NULL,
    'Westside Community Center',
    40
),
(
    (SELECT organization_id FROM organization WHERE name = 'BrightFuture Builders'),
    'Community Tutoring',
    'Volunteer to tutor students in various subjects. Sessions pair one tutor with one or two students in reading, math, and science for grades 3 through 8.',
    'Educational',
    '2026-12-01', '16:00', '18:00', 'Every Tuesday',
    'Lincoln Branch Library, study rooms',
    15
),
(
    (SELECT organization_id FROM organization WHERE name = 'GreenHarvest Growers'),
    'Community Garden Planting',
    'Help prepare raised beds and plant winter greens at our urban farm. Volunteers will turn soil, spread compost, and plant seedlings. No experience needed.',
    'Environmental',
    '2026-11-28', '08:00', '11:00', NULL,
    'GreenHarvest Urban Farm, 4th Street lot',
    20
),
(
    (SELECT organization_id FROM organization WHERE name = 'UnityServe Volunteers'),
    'Senior Wellness Fair',
    'Support a free health fair for older neighbors. Volunteers will greet guests, guide them between screening stations, and help with setup and cleanup.',
    'Health and Wellness',
    '2026-12-05', '10:00', '15:00', NULL,
    'Maplewood Senior Center',
    30
),
(
    (SELECT organization_id FROM organization WHERE name = 'BrightFuture Builders'),
    'Shelter Dog Walk Day',
    'Give shelter dogs a morning outdoors. Volunteers will walk dogs on the shelter trail, refill water stations, and help with kennel cleaning afterward.',
    'Animal Welfare',
    '2026-12-12', '09:00', '12:00', NULL,
    'Riverside Animal Shelter',
    18
),
(
    (SELECT organization_id FROM organization WHERE name = 'GreenHarvest Growers'),
    'Holiday Meal Packing',
    'Pack holiday meal boxes for families in need. Volunteers will assemble boxes with fresh produce from the farm and pantry staples, then load them for delivery.',
    'Community Service',
    '2026-12-19', '13:00', '17:00', NULL,
    'Westside Community Center kitchen',
    35
),
(
    (SELECT organization_id FROM organization WHERE name = 'UnityServe Volunteers'),
    'Winter Coat Drive',
    'Collect and sort donated winter coats for neighbors facing the cold. Volunteers will check items, organize by size, and staff the pickup table.',
    'Community Service',
    '2027-01-09', '10:00', '14:00', NULL,
    'Lincoln Branch Library lobby',
    20
);

SELECT * FROM project;

-- ========================================
-- Project Categories Table
-- ========================================
CREATE TABLE project_categories (
    category_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NOT NULL
);

-- ========================================
-- Insert sample data: Categories
-- ========================================
INSERT INTO project_categories (name, description)
VALUES
('Environmental', 'Protect and restore the natural spaces in our community through hands-on outdoor work.'),
('Educational', 'Help learners of all ages build skills and confidence through tutoring and mentoring.'),
('Community Service', 'Meet everyday needs and strengthen neighborhoods through direct, practical help.'),
('Health and Wellness', 'Promote healthy living and connect neighbors with the care and resources they need.'),
('Animal Welfare', 'Care for shelter animals and support adoption, fostering, and rescue efforts across the community.');

SELECT * FROM project_categories;

-- ========================================
-- Link projects to categories by foreign key
-- (replaces the plain-text category column)
-- ========================================
ALTER TABLE project
    ADD COLUMN category_id INTEGER REFERENCES project_categories(category_id);

UPDATE project p
SET category_id = c.category_id
FROM project_categories c
WHERE c.name = p.category;

ALTER TABLE project
    ALTER COLUMN category_id SET NOT NULL;

ALTER TABLE project
    DROP COLUMN category;

SELECT p.name, c.name AS category_name
FROM project p
JOIN project_categories c ON c.category_id = p.category_id;

ALTER TABLE public.category RENAME TO project_categories;

INSERT INTO public.project_categories (name, description)
VALUES ('Animal Welfare', 'Care for shelter animals and support adoption, fostering, and rescue efforts across the community.');

SELECT * FROM public.project_categories;