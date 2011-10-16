namespace Northwind.Web.Controllers.Organization.ViewModels
{
    using System.Collections.Generic;
    using Domain;
    using Domain.Organization;

    public class ViewEmployeesViewModel
    {
        public IList<Territory> AvailableTerritories { get; internal set; }

        public IList<Employee> Employees { get; internal set; }
    }
}