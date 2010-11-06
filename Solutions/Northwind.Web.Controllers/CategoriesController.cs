using Northwind.Domain.Contracts.Tasks;

namespace Northwind.Web.Controllers
{
    using System.Web.Mvc;

    [HandleError]
    public class CategoriesController : Controller
    {
        private readonly ICategoryTasks categoryTasks;

        public CategoriesController(ICategoryTasks categoryTasks) {
            this.categoryTasks = categoryTasks;
        }

        /// <summary>
        ///   An example of creating an object with an auto incrementing ID.
        /// 
        ///   Because this uses a declarative transaction, everything within this method is wrapped
        ///   within a single transaction.
        /// </summary>
        public ActionResult Create(string categoryName) {
            var category = categoryTasks.Create(categoryName);
            return View(category);
        }

        /// <summary>
        ///   The transaction on this action is optional, but recommended for performance reasons
        /// </summary>
        public ActionResult Index() {
            var categories = categoryTasks.GetAllCategories();
            return View(categories);
        }

        /// <summary>
        ///   The transaction on this action is optional, but recommended for performance reasons
        /// </summary>
        public ActionResult Show(int id) {
            var category = categoryTasks.GetCategoryById(id);
            return View(category);
        }
    }
}