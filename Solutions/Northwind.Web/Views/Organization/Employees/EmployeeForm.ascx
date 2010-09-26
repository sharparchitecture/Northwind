<%@ Control Language="C#" AutoEventWireup="true"
	Inherits="System.Web.Mvc.ViewUserControl<Northwind.Web.Controllers.Organization.EmployeesController.EmployeeFormViewModel>" %>
<%@ Import Namespace="Northwind.Web.Controllers" %>
<%@ Import Namespace="Northwind.Web.Controllers.Organization" %>

<%
    if (this.ViewContext.TempData[ControllerEnums.GlobalViewDataProperty.PageMessage.ToString()] != null)
    {%>
    <p id="pageMessage"><%=this.ViewContext.TempData[ControllerEnums.GlobalViewDataProperty.PageMessage.ToString()]%></p>
<%
    }%>

<%=this.Html.ValidationSummary()%>

<%
    using (this.Html.BeginForm())
    {%>
    <%=this.Html.AntiForgeryToken()%>
    <%=
            this.Html.Hidden(
                "Employee.Id", (this.ViewData.Model.Employee != null) ? this.ViewData.Model.Employee.Id : 0)%>

    <!--
        Be sure to use CSS driven forms instead of layout via tables; 
        see http://wufoo.com/gallery/ for a ton of examples and templates.
        You can also Google "tableless forms" or "CSS forms."
    -->
    <ul>
		<li>
			<label for="Employee_FirstName">FirstName:</label>
			<div>
				<%=
            this.Html.TextBox(
                "Employee.FirstName",
                (this.ViewData.Model.Employee != null) ? this.ViewData.Model.Employee.FirstName : "")%>
			</div>
			<%=this.Html.ValidationMessage("Employee.FirstName")%>
		</li>
		<li>
			<label for="Employee_LastName">LastName:</label>
			<div>
				<%=
            this.Html.TextBox(
                "Employee.LastName", (this.ViewData.Model.Employee != null) ? this.ViewData.Model.Employee.LastName : "")%>
			</div>
			<%=this.Html.ValidationMessage("Employee.LastName")%>
		</li>
		<li>
			<label for="Employee_PhoneExtension">PhoneExtension:</label>
			<div>
				<%=
            this.Html.TextBox(
                "Employee.PhoneExtension",
                (this.ViewData.Model.Employee != null) ? this.ViewData.Model.Employee.PhoneExtension.ToString() : "")%>
			</div>
			<%=this.Html.ValidationMessage("Employee.PhoneExtension")%>
		</li>
		<li>
			<label for="Employee_Territories">Territories:</label>
            <span id="Employee_Territories">
                <table>
                    <tr>
                    <%
        for (var i = 0; i < this.ViewData.Model.AvailableTerritories.Count(); i++)
        {
            if (i > 0 && i % 4 == 0)
            {
                %></tr><tr><%
            }

            var territory = this.ViewData.Model.AvailableTerritories[i];
%>
                        <td>
                            <!-- 
                            It's very important that the name of the checkbox has a "." in it so that 
                            the binder sees it as a property value.
                            -->
                            <input type="checkbox" name="Employee.Territories" value="<%=territory.Id%>" <%
            if (this.ViewData.Model.Employee != null && this.ViewData.Model.Employee.Territories.Contains(territory))
            {%>checked="checked"<%
            }%>/> 
                            <%=territory.Description%>
                        </td>
                    <%
        }%>
                    </tr>
                </table>
            </span>
		</li>
	    <li>
            <%=this.Html.SubmitButton("btnSave", "Save Employee")%>
	        <%=
            this.Html.Button(
                "btnCancel",
                "Cancel",
                HtmlButtonType.Button,
                "window.location.href = '" + this.Html.BuildUrlFromExpression<EmployeesController>(c => c.Index()) +
                "';")%>
        </li>
    </ul>
<%
    }%>
