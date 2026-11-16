// Import any needed model functions
import { getAllCategories, getCategoryDetails } from '../models/categories.js';
import { getAllProjects, getProjectsByCategoryId } from '../models/projects.js';

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

// Export any controller functions
export { showCategoriesPage, showCategoryDetailsPage };
