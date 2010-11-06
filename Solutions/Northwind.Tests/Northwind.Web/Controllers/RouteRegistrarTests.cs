namespace Tests.Northwind.Web.Controllers
{
    using System.Web.Routing;

    using MvcContrib.TestHelper;

    using global::Northwind.Web.Controllers;

    using NUnit.Framework;

    [TestFixture]
    public class RouteRegistrarTests
    {
        [Test]
        public void CanVerifyRouteMaps()
        {
            "~/".Route().ShouldMapTo<HomeController>(x => x.Index());
        }

        [SetUp]
        public void SetUp()
        {
            RouteTable.Routes.Clear();
            RouteRegistrar.RegisterRoutesTo(RouteTable.Routes);
        }
    }
}