namespace Northwind.Web.Controllers
{
    using System.Web.Mvc;

    using Northwind.Core;
    using Northwind.Core.DataInterfaces;

    using SharpArch.Core;
    using SharpArch.Web.NHibernate;

    [HandleError]
    public class CustomersController : Controller
    {
        private readonly ICustomerRepository customerRepository;

        public CustomersController(ICustomerRepository customerRepository)
        {
            Check.Require(customerRepository != null, "customerRepository may not be null");

            this.customerRepository = customerRepository;
        }

        /// <summary>
        ///   An example of creating an object with an assigned ID.  Because this uses a declarative 
        ///   transaction, everything within this method is wrapped within a single transaction.
        /// 
        ///   I'd like to be perfectly clear that I think assigned IDs are almost always a terrible
        ///   idea; this is a major complaint I have with the Northwind database.  With that said, 
        ///   some legacy databases require such techniques.
        /// </summary>
        [Transaction]
        public ActionResult Create(string companyName, string assignedId)
        {
            var customer = new Customer(companyName);
            customer.SetAssignedIdTo(assignedId);
            this.customerRepository.Save(customer);

            return View(customer);
        }

        /// <summary>
        ///   The transaction on this action is optional, but recommended for performance reasons
        /// </summary>
        [Transaction]
        public ActionResult Index()
        {
            var customers = this.customerRepository.FindByCountry("Venezuela");
            return View(customers);
        }
    }
}