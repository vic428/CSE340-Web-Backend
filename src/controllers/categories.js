// Import any needed model functions
import { getAllCategories } from '../models/categories.js';
import { getAllProjects } from '../models/projects.js';

// Define any controller functions
const showCategoriesPage = async (req, res) => {
    const categories = await getAllCategories();
    const projects = await getAllProjects();
    const title = 'Service Project Categories';

    res.render('categories', { title, categories, projects });
};

// Export any controller functions
export { showCategoriesPage };
