namespace Northwind.Domain.Contracts.Tasks
{
    using System.Collections.Generic;

    public interface ICustomerTasks
    {
        List<Customer> GetCustomersByCountry(string country);
        Customer Create(string customerName, string assignedId);
    }
}
