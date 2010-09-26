namespace Northwind.Web.CastleWindsor
{
    using Castle.Core;
    using Castle.Core.Configuration;
    using Castle.Core.Interceptor;
    using Castle.Facilities.FactorySupport;
    using Castle.MicroKernel.Registration;
    using Castle.Windsor;

    using Northwind.Wcf;
    using Northwind.WcfServices;
    using Northwind.Web.WcfServices;

    using SharpArch.Core.CommonValidator;
    using SharpArch.Core.NHibernateValidator.CommonValidatorAdapter;
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
            AddApplicationServicesTo(container);
            AddWcfServiceFactoriesTo(container);

            container.AddComponent("validator", typeof(IValidator), typeof(Validator));
        }

        private static void AddApplicationServicesTo(IWindsorContainer container)
        {
            container.Register(
                AllTypes.Pick().FromAssemblyNamed("Northwind.ApplicationServices").WithService.FirstInterface());
        }

        private static void AddCustomRepositoriesTo(IWindsorContainer container)
        {
            container.Register(
                AllTypes.Pick().FromAssemblyNamed("Northwind.Data").WithService.FirstNonGenericCoreInterface(
                    "Northwind.Core"));
        }

        private static void AddGenericRepositoriesTo(IWindsorContainer container)
        {
            container.AddComponent(
                "entityDuplicateChecker", typeof(IEntityDuplicateChecker), typeof(EntityDuplicateChecker));
            container.AddComponent("repositoryType", typeof(IRepository<>), typeof(Repository<>));
            container.AddComponent(
                "nhibernateRepositoryType", typeof(INHibernateRepository<>), typeof(NHibernateRepository<>));
            container.AddComponent(
                "repositoryWithTypedId", typeof(IRepositoryWithTypedId<,>), typeof(RepositoryWithTypedId<,>));
            container.AddComponent(
                "nhibernateRepositoryWithTypedId", 
                typeof(INHibernateRepositoryWithTypedId<,>), 
                typeof(NHibernateRepositoryWithTypedId<,>));
        }

        private static void AddWcfServiceFactoriesTo(IWindsorContainer container)
        {
            container.AddFacility("factories", new FactorySupportFacility());
            container.AddComponent("standard.interceptor", typeof(StandardInterceptor));

            var factoryKey = "territoriesWcfServiceFactory";
            var serviceKey = "territoriesWcfService";

            container.AddComponent(factoryKey, typeof(TerritoriesWcfServiceFactory));
            var config = new MutableConfiguration(serviceKey);
            config.Attributes["factoryId"] = factoryKey;
            config.Attributes["factoryCreate"] = "Create";
            container.Kernel.ConfigurationStore.AddComponentConfiguration(serviceKey, config);
            container.Kernel.AddComponent(
                serviceKey, 
                typeof(ITerritoriesWcfService), 
                typeof(TerritoriesWcfServiceClient), 
                LifestyleType.PerWebRequest);
        }
    }
}