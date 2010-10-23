namespace Northwind.Web.Controllers
{
    using System.Web.Mvc;

    using Northwind.Domain;

    using SharpArch.Core;
    using SharpArch.Core.PersistenceSupport;
    using SharpArch.Web.NHibernate;

    [HandleError]
    public class CategoriesController : Controller
    {
        private readonly IRepository<Category> categoryRepository;

        public CategoriesController(IRepository<Category> categoryRepository)
        {
            Check.Require(categoryRepository != null, "categoryRepository may not be null");

            this.categoryRepository = categoryRepository;
        }

        /// <summary>
        ///   An example of creating an object with an auto incrementing ID.
        /// 
        ///   Because this uses a declarative transaction, everything within this method is wrapped
        ///   within a single transaction.
        /// </summary>
        [Transaction]
        public ActionResult Create(string categoryName)
        {
            var category = new Category(categoryName);
            category = this.categoryRepository.SaveOrUpdate(category);

            return View(category);
        }

        /// <summary>
        ///   The transaction on this action is optional, but recommended for performance reasons
        /// </summary>
        [Transaction]
        public ActionResult Index()
        {
            var categories = this.categoryRepository.GetAll();
            return View(categories);
        }

        /// <summary>
        ///   The transaction on this action is optional, but recommended for performance reasons
        /// </summary>
        [Transaction]
        public ActionResult Show(int id)
        {
            var category = this.categoryRepository.Get(id);
            return View(category);
        }
    }
}