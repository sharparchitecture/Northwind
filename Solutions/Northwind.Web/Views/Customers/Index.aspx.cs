namespace Northwind.Web.Views.Customers
{
    using System.Collections.Generic;
    using System.Web.Mvc;

    using Northwind.Core;

    /// <summary>
    ///   This is an example of using a code-behind page with an ASP.NET MVC view.
    ///   It's generally considered better practice to avoid code-behind pages within MVC.
    /// </summary>
    public partial class Index : ViewPage<IList<Customer>>
    {
        public void Page_Load()
        {
            this.customerList.DataSource = this.ViewData.Model;
            this.customerList.DataBind();
        }
    }
}