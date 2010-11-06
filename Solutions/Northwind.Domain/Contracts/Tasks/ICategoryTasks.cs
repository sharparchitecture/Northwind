using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace Northwind.Domain.Contracts.Tasks
{
    public interface ICategoryTasks
    {
        List<Category> GetAllCategories();
        Category GetCategoryById(int id);
        Category Create(string categoryName);
    }
}
