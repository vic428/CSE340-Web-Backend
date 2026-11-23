// Import any needed model functions
import {
    getAllCategories,
    getCategoryDetails,
    getCategoriesByProjectId,
    updateCategoryAssignments
} from '../models/categories.js';
import { getAllProjects, getProjectsByCategoryId, getProjectDetails } from '../models/projects.js';

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

// Export any controller functions
export {
    showCategoriesPage,
    showCategoryDetailsPage,
    showAssignCategoriesForm,
    processAssignCategoriesForm
};
