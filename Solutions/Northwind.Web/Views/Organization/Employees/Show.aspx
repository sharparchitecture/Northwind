<%@ Page Title="Employee Details" Language="C#" MasterPageFile="~/Views/Shared/Site.Master" AutoEventWireup="true" 
	Inherits="System.Web.Mvc.ViewPage<Northwind.Domain.Organization.Employee>" %>
<%@ Import Namespace="Northwind.Web.Controllers.Organization" %>

<asp:Content ContentPlaceHolderID="MainContentPlaceHolder" runat="server">

    <h1>Employee Details</h1>

    <ul>
		<li>
			<label for="Employee_FirstName">FirstName:</label>
            <span id="Employee_FirstName"><%=this.Server.HtmlEncode(this.ViewData.Model.FirstName)%></span>
		</li>
		<li>
			<label for="Employee_LastName">LastName:</label>
            <span id="Employee_LastName"><%=this.Server.HtmlEncode(this.ViewData.Model.LastName)%></span>
		</li>
		<li>
			<label for="Employee_PhoneExtension">PhoneExtension:</label>
            <span id="Employee_PhoneExtension"><%=this.Server.HtmlEncode(this.ViewData.Model.PhoneExtension.ToString())%></span>
		</li>
		<li>
			<label for="Employee_Territories">Territories:</label>
            <span id="Employee_Territories">
                <ul>
                    <%
                        foreach (var territory in this.ViewData.Model.Territories)
                        {%>
                            <li><%=territory.Description%></li>
                        <%
                        }
%>
                </ul>
            </span>
		</li>
	    <li class="buttons">
            <%=
                this.Html.Button(
                    "btnBack",
                    "Back",
                    HtmlButtonType.Button,
                    "window.location.href = '" + this.Html.BuildUrlFromExpression<EmployeesController>(c => c.Index()) +
                    "';")%>
        </li>
	</ul>

</asp:Content>
