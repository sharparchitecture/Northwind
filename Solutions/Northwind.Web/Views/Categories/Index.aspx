<%@ Page Title="" Language="C#" MasterPageFile="~/Views/Shared/Site.Master" AutoEventWireup="true" Inherits="System.Web.Mvc.ViewPage<IList<Northwind.Domain.Category>>" %>
<%@ Import Namespace="Northwind.Web.Controllers" %>

<asp:Content ID="Content1" ContentPlaceHolderID="MainContentPlaceHolder" runat="server">
    <h2>Categories</h2>

    <form id="form1" runat="server">
    <div>
        <ul>
            <%
                foreach (var category in this.Model)
                {%>
                <li>
                    <%=
                        this.Html.ActionLink<CategoriesController>(c => c.Show(category.Id), (category.CategoryName))%>
                </li>
            <%
                }%>
        </ul>
    </div>
    </form>
</asp:Content>
