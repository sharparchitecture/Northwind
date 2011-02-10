namespace Northwind.Wcf.Web.CastleWindsor
{
    using Castle.MicroKernel.Registration;
    using Castle.Windsor;

    using Northwind.WcfServices;

    using SharpArch.Core.PersistenceSupport;
    using SharpArch.Core.PersistenceSupport.NHibernate;
    using SharpArch.Data.NHibernate;
    using SharpArch.Web.Castle;

    public class ComponentRegistrar
    {
        public static void AddComponentsTo(IWindsorContainer container)
        {
            AddGenericRepositoriesTo(container);
            AddCustomRepositoriesTo(container);
            AddWcfServicesTo(container);
        }

        private static void AddCustomRepositoriesTo(IWindsorContainer container)
        {
            container.Register(
                AllTypes
                    .FromAssemblyNamed("Northwind.Data")
                    .Pick()
                    .WithService.FirstNonGenericCoreInterface("Northwind.Domain"));
        }

        private static void AddGenericRepositoriesTo(IWindsorContainer container)
        {
            container.Register(
                    Component
                        .For(typeof(IRepository<>))
                        .ImplementedBy(typeof(Repository<>))
                        .Named("repositoryType"));

            container.Register(
                    Component
                        .For(typeof(INHibernateRepository<>))
                        .ImplementedBy(typeof(NHibernateRepository<>))
                        .Named("nhibernateRepositoryType"));

            container.Register(
                    Component
                        .For(typeof(IRepositoryWithTypedId<,>))
                        .ImplementedBy(typeof(RepositoryWithTypedId<,>))
                        .Named("repositoryWithTypedId"));

            container.Register(
                    Component
                        .For(typeof(INHibernateRepositoryWithTypedId<,>))
                        .ImplementedBy(typeof(NHibernateRepositoryWithTypedId<,>))
                        .Named("nhibernateRepositoryWithTypedId"));
        }

        private static void AddWcfServicesTo(IWindsorContainer container)
        {
            // Since the TerritoriesService.svc must be associated with a concrete class,
            // we must register the concrete implementation here as the service
            container.Register(Component.For(typeof(TerritoriesWcfService)).Named("territoriesWcfService"));
        }
    }
}