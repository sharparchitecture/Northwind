namespace Northwind.Web.Controllers
{
    using System.Web.Mvc;

    using Northwind.ApplicationServices;

    using SharpArch.Core;

    public class DashboardController : Controller
    {
        private readonly IDashboardService dashboardService;

        /// <summary>
        ///   Note that the application service gets injected into the controller.  Since it's not a 
        ///   repository (which gets automatically wired up for dependency injection), the service 
        ///   needs to be manually registered within Northwind.Web.CastleWindsor.ComponentRegistrar
        /// </summary>
        public DashboardController(IDashboardService dashboardService)
        {
            Check.Require(dashboardService != null, "dashboardService may not be null");

            this.dashboardService = dashboardService;
        }

        /// <summary>
        ///   Uses the application summary to collate the dashboard summary information
        /// </summary>
        public ActionResult Index()
        {
            var summary = this.dashboardService.GetDashboardSummary();

            return View(summary);
        }
    }
}