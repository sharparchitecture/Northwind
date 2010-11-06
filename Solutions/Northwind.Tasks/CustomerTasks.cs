using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Northwind.Domain;
using Northwind.Domain.Contracts;
using Northwind.Domain.Contracts.Tasks;
using SharpArch.Core;
using SharpArch.Core.PersistenceSupport;

namespace Northwind.Tasks
{
    public class CustomerTasks : ICustomerTasks
    {
        #region Fields

        private readonly ICustomerRepository customerRepository;

        #endregion

        public CustomerTasks(ICustomerRepository customerRepository) {
            this.customerRepository = customerRepository;
        }

        public List<Customer> GetCustomersByCountry(string country) {
            Check.Require(country != null, "country must be provided.");
            var customer = customerRepository.FindByCountry(country);
            return customer;
        }

        public Customer Create(string companyName, string assignedId) {
            var customerToCreate = new Customer(companyName);
            customerToCreate.SetAssignedIdTo(assignedId);

            customerRepository.DbContext.BeginTransaction();
            customerRepository.Save(customerToCreate);
            customerRepository.DbContext.CommitTransaction();

            return customerToCreate;
        }
    }
}
