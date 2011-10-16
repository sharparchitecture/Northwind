<%@ Page Title="" Language="C#" MasterPageFile="~/Views/Shared/Site.Master" AutoEventWireup="true" Inherits="System.Web.Mvc.ViewPage<IList<Customer>>" %>

<asp:Content ID="Content1" ContentPlaceHolderID="MainContentPlaceHolder" runat="server">
    <h2>Customers</h2>
    <p>All customers from Venezuela:</p>    
    <div>
        <ul>
            <%
                foreach (var customer in this.Model)
                {%>
                <li>
                    <%=customer.ContactName%>
                    has placed
                    <%=customer.Orders.Count%>
                    orders. </li>
            <%
                }%>
        </ul>
    </div>
</asp:Content>