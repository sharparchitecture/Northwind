using Northwind.Domain.Contracts.Tasks;

namespace Northwind.Web.Controllers.Organization
{
    using System.Collections.Generic;
    using System.Web.Mvc;

    using Domain;
    using Domain.Organization;
    using SharpArch.Web.ModelBinder;
    using SharpArch.Web.NHibernate;

    [HandleError]
    public class EmployeesController : Controller
    {
        private readonly IEmployeeTasks employeeTasks;
        private readonly ITerritoryTasks territoryTasks;

        /// <param name = "territoriesRepository">This service dependency will be used by the controller 
        ///   to populate the view model with a listing of all the available territories to select from.
        ///   Instead of passing this to the controller, the repository could instead be used by an 
        ///   application service, which would be injected into this controller, to populate the view
        ///   model.
        /// </param>

        public EmployeesController(IEmployeeTasks employeeTasks, ITerritoryTasks territoryTasks) {
            this.employeeTasks = employeeTasks;
            this.territoryTasks = territoryTasks;
        }

        public ActionResult Index() {
            var employees = employeeTasks.GetAllEmployees();
            return View(employees);
        }

        public ActionResult Show(int id) {
            var employee = employeeTasks.GetEmployeeById(id);
            return View(employee);
        }



        /// <summary>
        ///   As described at http://stephenwalther.com/blog/archive/2009/01/21/asp.net-mvc-tip-46-ndash-donrsquot-use-delete-links-because.aspx
        ///   there are a lot of arguments against doing a delete via a GET request.  This addresses that, accordingly.
        /// </summary>
        [ValidateAntiForgeryToken]
        [HttpPost]
        public ActionResult Delete(int id)
        {
            employeeTasks.Delete(id);
            return RedirectToAction("Index");
        }
        
        public ActionResult Edit(int id)
        {
            var viewModel = new EmployeeFormViewModel {
                                                        AvailableTerritories = territoryTasks.GetTerritories(),
                                                        Employee = employeeTasks.GetEmployeeById(id)
                                                      };

            return View(viewModel);
        }

        public ActionResult CreateOrUpdate(int id)
        {
            var viewModel = new EmployeeFormViewModel
                                {
                                    AvailableTerritories = territoryTasks.GetTerritories(),
                                    Employee = employeeTasks.GetEmployeeById(id)
                                };

            return View(viewModel);
        }

        /// <summary>
        ///   Accepts the form submission to update an existing item. This uses 
        ///   <see cref = "SharpModelBinder" /> to bind the model from the form.
        /// </summary>
        [ValidateAntiForgeryToken]
        [Transaction]
        [HttpPost]
        public ActionResult CreateOrUpdate(Employee employee)
        {
            employeeTasks.CreateOrUpdate(employee);

            if (employee.IsValid()) {
                TempData[ControllerEnums.GlobalViewDataProperty.PageMessage.ToString()] = "The employee was successfully updated.";
                return RedirectToAction("Index");
            }

            var viewModel = new EmployeeFormViewModel
                                                  {
                                                      AvailableTerritories = territoryTasks.GetTerritories(),
                                                      Employee = employee
                                                  };
            return View(viewModel);
        }


        /// <summary>
        ///   Holds data to be passed to the Employee form for creates and edits
        /// </summary>
        public class EmployeeFormViewModel
        {
            public IList<Territory> AvailableTerritories { get; internal set; }
            public Employee Employee { get; internal set; }
        }
    }
}