namespace Northwind.Domain.Contracts.Tasks
{
    using System.Collections.Generic;
    using Organization;

    public interface IEmployeeTasks
    {
        IList<Employee> GetAllEmployees();
        Employee GetEmployeeById(int id);

        void CreateOrUpdate(Employee employee);
        void Delete(int id);
    }
}
