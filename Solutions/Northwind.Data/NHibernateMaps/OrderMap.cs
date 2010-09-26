namespace Northwind.Data.NHibernateMappings
{
    using FluentNHibernate.Automapping;
    using FluentNHibernate.Automapping.Alterations;

    using Northwind.Core;

    public class OrderMap : IAutoMappingOverride<Order>
    {
        public void Override(AutoMapping<Order> mapping)
        {
            mapping.Id(x => x.Id, "OrderID").UnsavedValue(0).GeneratedBy.Identity();

            mapping.Map(x => x.ShipToName, "ShipName");

            mapping.References(x => x.OrderedBy, "CustomerID").Not.Nullable();
        }
    }
}