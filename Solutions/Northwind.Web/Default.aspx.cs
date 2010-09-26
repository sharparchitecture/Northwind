namespace Northwind.Web
{
    using System;
    using System.Web;
    using System.Web.Mvc;
    using System.Web.UI;

    public class _Default : Page
    {
        public void Page_Load(object sender, EventArgs e)
        {
            HttpContext.Current.RewritePath(this.Request.ApplicationPath, false);
            IHttpHandler httpHandler = new MvcHttpHandler();
            httpHandler.ProcessRequest(HttpContext.Current);
        }
    }
}