using Castle.Windsor;
using Northwind.Wcf;
using Northwind.WcfServices;
using Northwind.Web.WcfServices;
using SharpArch.Core.PersistenceSupport.NHibernate;
using SharpArch.Data.NHibernate;
using SharpArch.Core.PersistenceSupport;
using SharpArch.Web.Castle;
using Castle.MicroKernel.Registration;
using SharpArch.Core.CommonValidator;
using SharpArch.Core.NHibernateValidator.CommonValidatorAdapter;
using Castle.Core.Configuration;
using Castle.Core;
using Castle.Facilities.FactorySupport;

namespace Northwind.Web.CastleWindsor
{
    using Castle.DynamicProxy;

    public class ComponentRegistrar
    {
        public static void AddComponentsTo(IWindsorContainer container) {
            AddGenericRepositoriesTo(container);
            AddCustomRepositoriesTo(container);
            AddApplicationServicesTo(container);
            AddWcfServiceFactoriesTo(container);

            container.Register(
                Component
                    .For(typeof(IValidator))
                    .ImplementedBy(typeof(Validator))
                    .Named("validator"));
        }

        private static void AddApplicationServicesTo(IWindsorContainer container) {
            container.Register(
                AllTypes
                .FromAssemblyNamed("Northwind.ApplicationServices")
                .Pick()
                .WithService.FirstInterface());
        }

        private static void AddWcfServiceFactoriesTo(IWindsorContainer container) {
            container.AddFacility("factories", new FactorySupportFacility());
            container.Register(Component.For(typeof(StandardInterceptor)).Named("standard.interceptor"));

            string factoryKey = "territoriesWcfServiceFactory";
            string serviceKey = "territoriesWcfService";

            container.Register(Component.For(typeof(TerritoriesWcfServiceFactory)).Named(factoryKey));
            MutableConfiguration config = new MutableConfiguration(serviceKey);
            config.Attributes["factoryId"] = factoryKey;
            config.Attributes["factoryCreate"] = "Create";
            container.Kernel.ConfigurationStore.AddComponentConfiguration(serviceKey, config);
            container.Register(
                    Component
                        .For(typeof(ITerritoriesWcfService))
                        .ImplementedBy(typeof(TerritoriesWcfServiceClient))
                        .LifeStyle.Is(LifestyleType.PerWebRequest));
            
        }

        private static void AddCustomRepositoriesTo(IWindsorContainer container) {
            container.Register(
                AllTypes
                .FromAssemblyNamed("Northwind.Data")
                .Pick()
                .WithService.FirstNonGenericCoreInterface("Northwind.Core"));
        }

        private static void AddGenericRepositoriesTo(IWindsorContainer container) {

            container.Register(
                    Component
                        .For(typeof(ISessionFactoryKeyProvider))
                        .ImplementedBy(typeof(DefaultSessionFactoryKeyProvider))
                        .Named("sessionFactoryKeyProvider"));

            container.Register(
                    Component
                        .For(typeof(IEntityDuplicateChecker))
                        .ImplementedBy(typeof(EntityDuplicateChecker))
                        .Named("entityDuplicateChecker"));

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
    }
}
