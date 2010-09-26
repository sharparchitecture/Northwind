namespace Tests.Northwind.Data
{
    using global::Northwind.Core;

    using NUnit.Framework;

    using SharpArch.Core.PersistenceSupport;
    using SharpArch.Data.NHibernate;
    using SharpArch.Testing.NUnit.NHibernate;

    [TestFixture]
    [Category("DB Tests")]
    public class ProxyEqualityTests : DatabaseRepositoryTestsBase
    {
        private readonly IRepository<Region> regionRepository = new Repository<Region>();

        private readonly IRepositoryWithTypedId<Territory, string> territoryRepository =
            new RepositoryWithTypedId<Territory, string>();

        [Test]
        public void ProxyEqualityTest()
        {
            var territory = this.territoryRepository.Get("31406");
            var proxiedRegion = territory.RegionBelongingTo;
            var unproxiedRegion = this.regionRepository.Get(4);

            Assert.IsTrue(proxiedRegion.Equals(unproxiedRegion));
            Assert.IsTrue(unproxiedRegion.Equals(proxiedRegion));
        }
    }
}