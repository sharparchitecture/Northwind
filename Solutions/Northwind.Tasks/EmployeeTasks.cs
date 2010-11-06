using System;
using System.IO;
using System.Runtime.Serialization;
using System.Runtime.Serialization.Formatters.Binary;

namespace Northwind.Tasks
{
    using System.Collections.Generic;
    using Domain.Contracts.Tasks;
    using Domain.Organization;
    using SharpArch.Core;
    using SharpArch.Core.PersistenceSupport;

    public class EmployeeTasks : IEmployeeTasks
    {
        #region Fields

        private readonly IRepository<Employee> employeeRepository;

        #endregion

        public EmployeeTasks(IRepository<Employee> employeeRepository) {
            this.employeeRepository = employeeRepository;
        }

        public void Delete(int id) {
            var employeeToRemove = employeeRepository.Get(id);

            Check.Require(employeeToRemove != null, "employee must exist.");

            if (employeeToRemove != null) {
                employeeRepository.DbContext.BeginTransaction();
                employeeRepository.Delete(employeeToRemove);
                employeeRepository.DbContext.CommitTransaction();
            }
        }
        
        public IList<Employee> GetAllEmployees() {
            employeeRepository.DbContext.BeginTransaction();
            var employees = employeeRepository.GetAll();
            employeeRepository.DbContext.CommitTransaction();
            return employees;
        }

        public Employee GetEmployeeById(int id) {
            if (id == 0)
            {
                return new Employee();
            }

            employeeRepository.DbContext.BeginTransaction();
            var employee = employeeRepository.Get(id);
            employeeRepository.DbContext.CommitTransaction();

            Check.Require(employee != null, "employee must exist.");
            return employee;
        }

        public void CreateOrUpdate(Employee employee)
        {
            var employeeToUpdate = employee.Clone();
            employee.Territories.Clear();

            foreach (var territory in employeeToUpdate.Territories) {
                employee.Territories.Add(territory);
            }

            if (employee.IsValid()) {
                employeeRepository.DbContext.BeginTransaction();
                employeeRepository.SaveOrUpdate(employee);
                employeeRepository.DbContext.CommitChanges();
            } else {
                employeeRepository.DbContext.RollbackTransaction();
            }
        }
    }

    /// <summary>
    /// Reference Article http://www.codeproject.com/KB/tips/SerializedObjectCloner.aspx
    /// 
    /// Provides a method for performing a deep copy of an object.
    /// Binary Serialization is used to perform the copy.
    /// </summary>

    public static class ObjectCopier
    {
        /// <summary>
        /// Perform a deep Copy of the object.
        /// </summary>
        /// <typeparam name="T">The type of object being copied.</typeparam>
        /// <param name="source">The object instance to copy.</param>
        /// <returns>The copied object.</returns>
        public static T Clone<T>(this T source) {
            if (!typeof(T).IsSerializable) {
                throw new ArgumentException("The type must be serializable.", "source");
            }

            // Don't serialize a null object, simply return the default for that object
            if (Object.ReferenceEquals(source, null)) {
                return default(T);
            }

            IFormatter formatter = new BinaryFormatter();
            Stream stream = new MemoryStream();
            using (stream) {
                formatter.Serialize(stream, source);
                stream.Seek(0, SeekOrigin.Begin);
                return (T)formatter.Deserialize(stream);
            }
        }
    } 
}
