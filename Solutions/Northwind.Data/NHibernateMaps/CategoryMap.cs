namespace Northwind.Data.NHibernateMappings
{
    using FluentNHibernate.Mapping;

    using Northwind.Core;

    public class CategoryMap : ClassMap<Category>
    {
        public CategoryMap()
        {
            this.Table("Categories");

            this.Id(x => x.Id, "CategoryID").UnsavedValue(0).GeneratedBy.Identity();

            this.Map(x => x.CategoryName, "CategoryName");
        }
    }
}