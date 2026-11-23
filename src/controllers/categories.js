// Import any needed model functions
import {
    getAllCategories,
    getCategoryDetails,
    getCategoriesByProjectId,
    updateCategoryAssignments,
    createCategory,
    updateCategory
} from '../models/categories.js';
import { getAllProjects, getProjectsByCategoryId, getProjectDetails } from '../models/projects.js';
import { body, validationResult } from 'express-validator';

// The database reports this error code when a unique value (here, the
// category name) is already in use
const UNIQUE_VIOLATION = '23505';

// Define validation and sanitization rules for the category forms.
// .bail() stops at the first failed rule so each field reports one message.
const categoryValidation = [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Category name is required')
        .bail()
        .isLength({ min: 3, max: 100 })
        .withMessage('Category name must be between 3 and 100 characters'),
    body('description')
        .trim()
        .notEmpty()
        .withMessage('Category description is required')
        .bail()
        .isLength({ max: 500 })
        .withMessage('Category description cannot exceed 500 characters')
];

// Define any controller functions
const showCategoriesPage = async (req, res) => {
    const categories = await getAllCategories();
    const projects = await getAllProjects();
    const title = 'Service Project Categories';

    res.render('categories', { title, categories, projects });
};

const showCategoryDetailsPage = async (req, res, next) => {
    const categoryId = req.params.id;
    const category = await getCategoryDetails(categoryId);

    // No category with this ID: hand a 404 to the global error handler
    if (!category) {
        const err = new Error('Category Not Found');
        err.status = 404;
        return next(err);
    }

    const projects = await getProjectsByCategoryId(categoryId);
    const title = 'Category Details';

    res.render('category', { title, category, projects });
};

const showAssignCategoriesForm = async (req, res, next) => {
    const projectId = req.params.projectId;

    const projectDetails = await getProjectDetails(projectId);

    // No project with this ID: hand a 404 to the global error handler
    if (!projectDetails) {
        const err = new Error('Project Not Found');
        err.status = 404;
        return next(err);
    }

    const categories = await getAllCategories();
    const assignedCategories = await getCategoriesByProjectId(projectId);

    const title = 'Assign Categories to Project';

    res.render('assign-categories', { title, projectId, projectDetails, categories, assignedCategories });
};

const processAssignCategoriesForm = async (req, res, next) => {
    const projectId = req.params.projectId;

    // No project with this ID: hand a 404 to the global error handler
    const projectDetails = await getProjectDetails(projectId);
    if (!projectDetails) {
        const err = new Error('Project Not Found');
        err.status = 404;
        return next(err);
    }

    const selectedCategoryIds = req.body?.categoryIds || [];

    // One checked box arrives as a string, several as an array
    const categoryIdsArray = Array.isArray(selectedCategoryIds) ? selectedCategoryIds : [selectedCategoryIds];

    // Only accept ids that belong to real categories
    const categories = await getAllCategories();
    const validIds = new Set(categories.map((category) => String(category.category_id)));
    if (!categoryIdsArray.every((id) => validIds.has(String(id)))) {
        req.flash('error', 'Please choose from the listed categories.');
        return res.redirect(`/assign-categories/${projectId}`);
    }

    await updateCategoryAssignments(projectId, categoryIdsArray);
    req.flash('success', 'Categories updated successfully.');
    res.redirect(`/project/${projectId}`);
};

const showNewCategoryForm = async (req, res) => {
    const title = 'Add New Category';

    res.render('new-category', { title });
};

const processNewCategoryForm = async (req, res) => {
    // Check for validation errors
    const results = validationResult(req);
    if (!results.isEmpty()) {
        // Validation failed - loop through errors
        results.array().forEach((error) => {
            req.flash('error', error.msg);
        });

        // Redirect back to the new category form
        return res.redirect('/new-category');
    }

    const { name, description } = req.body;

    try {
        const categoryId = await createCategory(name, description);

        // Set a success flash message
        req.flash('success', 'Category added successfully!');
        res.redirect(`/category/${categoryId}`);
    } catch (error) {
        console.error('Error creating new category:', error);
        req.flash('error', error.code === UNIQUE_VIOLATION
            ? 'A category with that name already exists.'
            : 'There was an error creating the category.');
        res.redirect('/new-category');
    }
};

const showEditCategoryForm = async (req, res, next) => {
    const categoryId = req.params.id;
    const category = await getCategoryDetails(categoryId);

    // No category with this ID: hand a 404 to the global error handler
    if (!category) {
        const err = new Error('Category Not Found');
        err.status = 404;
        return next(err);
    }

    const title = 'Edit Category';
    res.render('edit-category', { title, category });
};

const processEditCategoryForm = async (req, res, next) => {
    const categoryId = req.params.id;

    // No category with this ID: hand a 404 to the global error handler
    const category = await getCategoryDetails(categoryId);
    if (!category) {
        const err = new Error('Category Not Found');
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

        // Redirect back to the edit category form
        return res.redirect('/edit-category/' + categoryId);
    }

    const { name, description } = req.body;

    try {
        await updateCategory(categoryId, name, description);

        // Set a success flash message
        req.flash('success', 'Category updated successfully!');
        res.redirect(`/category/${categoryId}`);
    } catch (error) {
        console.error('Error updating category:', error);
        req.flash('error', error.code === UNIQUE_VIOLATION
            ? 'A category with that name already exists.'
            : 'There was an error updating the category.');
        res.redirect('/edit-category/' + categoryId);
    }
};

// Export any controller functions
export {
    showCategoriesPage,
    showCategoryDetailsPage,
    showAssignCategoriesForm,
    processAssignCategoriesForm,
    showNewCategoryForm,
    processNewCategoryForm,
    showEditCategoryForm,
    processEditCategoryForm,
    categoryValidation
};
