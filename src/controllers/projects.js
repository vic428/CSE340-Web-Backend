// Import any needed model functions
import { getUpcomingProjects, getProjectDetails, createProject, updateProject } from '../models/projects.js';
import { getAllCategories, getCategoriesByProjectId } from '../models/categories.js';
import { getAllOrganizations } from '../models/organizations.js';
import { body, validationResult } from 'express-validator';

// Matches a 24-hour time such as "09:00" or "17:30" (seconds optional)
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

// Define validation and sanitization rules shared by the new and edit project
// forms. .bail() stops at the first failed rule so each field reports one message.
const projectFieldValidation = [
    body('title')
        .trim()
        .notEmpty()
        .withMessage('Project title is required')
        .bail()
        // The project name column holds at most 150 characters
        .isLength({ min: 3, max: 150 })
        .withMessage('Project title must be between 3 and 150 characters'),
    body('description')
        .trim()
        .notEmpty()
        .withMessage('Project description is required')
        .bail()
        .isLength({ max: 1000 })
        .withMessage('Project description cannot exceed 1000 characters'),
    body('location')
        .trim()
        .notEmpty()
        .withMessage('Project location is required')
        .bail()
        .isLength({ max: 200 })
        .withMessage('Project location cannot exceed 200 characters'),
    body('date')
        .trim()
        .notEmpty()
        .withMessage('Project date is required')
        .bail()
        .isISO8601({ strict: true })
        .withMessage('Please provide a valid date'),
    body('startTime')
        .trim()
        .notEmpty()
        .withMessage('Start time is required')
        .bail()
        .matches(TIME_PATTERN)
        .withMessage('Please provide a valid start time'),
    body('endTime')
        .trim()
        .notEmpty()
        .withMessage('End time is required')
        .bail()
        .matches(TIME_PATTERN)
        .withMessage('Please provide a valid end time')
        .bail()
        .custom((endTime, { req }) => {
            const startTime = req.body.startTime;
            // Only compare when the start time is itself valid
            return !TIME_PATTERN.test(startTime) || endTime > startTime;
        })
        .withMessage('End time must be after the start time'),
    body('volunteersNeeded')
        .trim()
        .notEmpty()
        .withMessage('Number of volunteers needed is required')
        .bail()
        .isInt({ min: 1, max: 10000 })
        .withMessage('Volunteers needed must be a whole number of at least 1'),
    body('recurrence')
        .trim()
        .isLength({ max: 100 })
        .withMessage('Recurrence cannot exceed 100 characters'),
    body('organizationId')
        .trim()
        .notEmpty()
        .withMessage('Please select an organization')
        .bail()
        .isInt({ min: 1 })
        .withMessage('Please select a valid organization')
];

// The new project form also picks the project's first category
const projectValidation = [
    ...projectFieldValidation,
    body('categoryId')
        .trim()
        .notEmpty()
        .withMessage('Please select a category')
        .bail()
        .isInt({ min: 1 })
        .withMessage('Please select a valid category')
];

// The edit project form has no category field (categories are edited on
// the assign categories page), so it uses only the shared rules
const projectEditValidation = projectFieldValidation;

// Format a Date from the database as "YYYY-MM-DD" for an <input type="date">.
// Local date parts are used because the database driver creates the Date at
// local midnight; converting to UTC first could shift it to the previous day.
const toDateInputValue = (date) => {
    const value = new Date(date);
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${value.getFullYear()}-${month}-${day}`;
};

// How many upcoming projects the projects page should list
const NUMBER_OF_UPCOMING_PROJECTS = 5;

// Define any controller functions
const showProjectsPage = async (req, res) => {
    const projects = await getUpcomingProjects(NUMBER_OF_UPCOMING_PROJECTS);
    const title = 'Upcoming Service Projects';

    res.render('projects', { title, projects });
};

const showProjectDetailsPage = async (req, res, next) => {
    const projectId = req.params.id;
    const project = await getProjectDetails(projectId);

    // No project with this ID: hand a 404 to the global error handler
    if (!project) {
        const err = new Error('Project Not Found');
        err.status = 404;
        return next(err);
    }

    const categories = await getCategoriesByProjectId(projectId);
    const title = 'Project Details';

    res.render('project', { title, project, categories });
};

const showNewProjectForm = async (req, res) => {
    // Both lists populate dropdown menus on the form
    const organizations = await getAllOrganizations();
    const categories = await getAllCategories();
    const title = 'Add New Service Project';

    res.render('new-project', { title, organizations, categories });
};

const processNewProjectForm = async (req, res) => {
    // Check for validation errors
    const results = validationResult(req);
    if (!results.isEmpty()) {
        // Validation failed - loop through errors
        results.array().forEach((error) => {
            req.flash('error', error.msg);
        });

        // Redirect back to the new project form
        return res.redirect('/new-project');
    }

    // Extract form data from req.body
    const {
        title, description, location, date, organizationId,
        startTime, endTime, volunteersNeeded, categoryId, recurrence
    } = req.body;

    try {
        // Create the new project in the database. The project table also
        // requires times, a volunteer count, and a category.
        await createProject(title, description, location, date, organizationId, {
            startTime,
            endTime,
            volunteersNeeded,
            categoryId,
            recurrence: recurrence || null // Store "no recurrence" as NULL
        });

        req.flash('success', 'New service project created successfully!');
        res.redirect('/projects');
    } catch (error) {
        console.error('Error creating new project:', error);
        req.flash('error', 'There was an error creating the service project.');
        res.redirect('/new-project');
    }
};

const showEditProjectForm = async (req, res, next) => {
    const projectId = req.params.id;
    const project = await getProjectDetails(projectId);

    // No project with this ID: hand a 404 to the global error handler
    if (!project) {
        const err = new Error('Project Not Found');
        err.status = 404;
        return next(err);
    }

    // The list of organizations populates the dropdown menu on the form
    const organizations = await getAllOrganizations();

    // Convert the stored date and times to the formats the form inputs expect
    const formValues = {
        date: toDateInputValue(project.event_date),
        startTime: project.start_time.slice(0, 5), // "09:00:00" -> "09:00"
        endTime: project.end_time.slice(0, 5)
    };

    const title = 'Edit Service Project';
    res.render('edit-project', { title, project, organizations, formValues });
};

const processEditProjectForm = async (req, res, next) => {
    const projectId = req.params.id;

    // No project with this ID: hand a 404 to the global error handler
    const project = await getProjectDetails(projectId);
    if (!project) {
        const err = new Error('Project Not Found');
        err.status = 404;
        return next(err);
    }

    // Check for validation errors
    const results = validationResult(req);
    if (!results.isEmpty()) {
        // Validation failed - loop through errors
        results.array().forEach((error) => {
            req.flash('error', error.msg);
        });

        // Redirect back to the edit project form
        return res.redirect('/edit-project/' + projectId);
    }

    // Extract form data from req.body
    const {
        title, description, location, date, organizationId,
        startTime, endTime, volunteersNeeded, recurrence
    } = req.body;

    try {
        await updateProject(projectId, title, description, location, date, organizationId, {
            startTime,
            endTime,
            volunteersNeeded,
            recurrence: recurrence || null // Store "no recurrence" as NULL
        });

        // Set a success flash message
        req.flash('success', 'Service project updated successfully!');
        res.redirect(`/project/${projectId}`);
    } catch (error) {
        console.error('Error updating project:', error);
        req.flash('error', 'There was an error updating the service project.');
        res.redirect('/edit-project/' + projectId);
    }
};

// Export any controller functions
export {
    showProjectsPage,
    showProjectDetailsPage,
    showNewProjectForm,
    processNewProjectForm,
    showEditProjectForm,
    processEditProjectForm,
    projectValidation,
    projectEditValidation
};
