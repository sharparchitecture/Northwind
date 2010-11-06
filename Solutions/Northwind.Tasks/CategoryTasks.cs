using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Northwind.Domain;
using Northwind.Domain.Contracts.Tasks;
using Northwind.Domain.Organization;
using SharpArch.Core;
using SharpArch.Core.PersistenceSupport;

namespace Northwind.Tasks
{
    public class CategoryTasks : ICategoryTasks
    {
        #region Fields

        private readonly IRepository<Category> categoryRepository;

        #endregion

        public CategoryTasks(IRepository<Category> categoryRepository) {
            this.categoryRepository = categoryRepository;
        }

        public List<Category> GetAllCategories() {
            categoryRepository.DbContext.BeginTransaction();
            var categories = categoryRepository.GetAll();
            categoryRepository.DbContext.CommitTransaction();

            return categories.ToList();
        }

        public Category GetCategoryById(int id) {
            categoryRepository.DbContext.BeginTransaction();
            var category = categoryRepository.Get(id);
            categoryRepository.DbContext.CommitTransaction();

            return category;
        }

        public Category Create(string categoryName) {
            var category = new Category(categoryName);
            categoryRepository.DbContext.BeginTransaction();
            category = categoryRepository.SaveOrUpdate(category);
            categoryRepository.DbContext.CommitTransaction();

            return category;
        }
    }
}
