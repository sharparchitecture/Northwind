namespace Northwind.Core.DataInterfaces
{
    using System.Collections.Generic;

    using SharpArch.Core.PersistenceSupport;

    public interface ISupplierRepository : IRepository<Supplier>
    {
        List<Supplier> GetSuppliersBy(string productCategoryName);
    }
}