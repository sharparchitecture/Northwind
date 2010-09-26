namespace Tests
{
    using Castle.Windsor;

    using CommonServiceLocator.WindsorAdapter;

    using Microsoft.Practices.ServiceLocation;

    using SharpArch.Core.CommonValidator;
    using SharpArch.Core.NHibernateValidator.CommonValidatorAdapter;
    using SharpArch.Core.PersistenceSupport;

    using Tests.Northwind.Data.TestDoubles;

    public class ServiceLocatorInitializer
    {
        public static void Init()
        {
            IWindsorContainer container = new WindsorContainer();
            container.AddComponent("validator", typeof(IValidator), typeof(Validator));
            container.AddComponent(
                "entityDuplicateChecker", typeof(IEntityDuplicateChecker), typeof(EntityDuplicateCheckerStub));
            ServiceLocator.SetLocatorProvider(() => new WindsorServiceLocator(container));
        }
    }
}