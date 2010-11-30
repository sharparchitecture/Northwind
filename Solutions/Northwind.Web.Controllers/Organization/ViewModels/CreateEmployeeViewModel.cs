namespace Northwind.Web.Controllers.Organization.ViewModels
{
    using Domain.Organization;

    public class CreateEmployeeViewModel
    {
        public Employee Employee { get; set; }

        public string AvailableTerritories { get; set; }
    }
}

