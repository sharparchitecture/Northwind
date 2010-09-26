<%@ Page Title="" Language="C#" MasterPageFile="~/Views/Shared/Site.Master" AutoEventWireup="true" Inherits="System.Web.Mvc.ViewPage<Northwind.Core.Category>" %>

<asp:Content ID="Content1" ContentPlaceHolderID="MainContentPlaceHolder" runat="server">
    <h2>Category Details</h2>

    <div>
        <p>
            ID:
            <%=this.ViewData.Model.Id%></p>
        <p>
            Name:
            <%=this.ViewData.Model.CategoryName%></p>
    </div>
</asp:Content>
