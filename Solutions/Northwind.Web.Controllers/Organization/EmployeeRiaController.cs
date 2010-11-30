namespace Northwind.Web.Controllers.Organization
{
    using System.Web.Mvc;
    using Domain.Contracts.Tasks;
    using SharpArch.Web.JsonNet;
    using SharpArch.Web.NHibernate;
    using ViewModels;

    [HandleError]
    public class EmployeeRiaController : Controller
    {
        private readonly IEmployeeTasks employeeTasks;
        private readonly ITerritoryTasks territoryTasks;

        public EmployeeRiaController(IEmployeeTasks employeeTasks, ITerritoryTasks territoryTasks) 
        {
            this.employeeTasks = employeeTasks;
            this.territoryTasks = territoryTasks;
        }

        [HttpGet]
        public ActionResult Index() 
        {
            return View();
        }

        [Transaction]
        [HttpGet]
        public JsonNetResult GetEmployeeFormViewModel() 
        {
            var employeeViewModel = new ViewEmployeesViewModel 
            {
                Employees = this.employeeTasks.GetAllEmployees(),
                AvailableTerritories = this.territoryTasks.GetTerritories()
            };

            return new JsonNetResult { Data = employeeViewModel };
        }

        [Transaction]
        [HttpPost]
        public JsonNetResult Edit(CreateEmployeeViewModel createEmployeeViewModel) 
        {
            this.employeeTasks.CreateOrUpdate(createEmployeeViewModel.Employee);

            return new JsonNetResult { Data = createEmployeeViewModel.Employee };
        }

        [Transaction]
        [HttpPost]
        public JsonNetResult Delete(int id) 
        {
            this.employeeTasks.Delete(id);
            return new JsonNetResult { Data = this.employeeTasks.GetAllEmployees() };
        }
    }
}