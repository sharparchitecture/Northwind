<%@ Page Title="Employees" Language="C#" MasterPageFile="~/Views/Shared/Site.Master" AutoEventWireup="true" %>
<asp:Content ContentPlaceHolderID="head" runat="server">
<script type="text/javascript" src="http://www.google.com/jsapi"></script>
	<script type="text/javascript">
	    google.load("jquery", "1.4.2");
	    google.load("jqueryui", "1.8.5", { uncompressed: true });
    </script>
    
    
    <script src="<%= Url.Content("~/Scripts/jquery.tmpl.js") %>" type="text/javascript"></script>    
    <script src="<%= Url.Content("~/Scripts/mscorlib.js") %>" type="text/javascript"></script>
    <script src="<%= Url.Content("~/Scripts/Northwind.Client.debug.js") %>" type="text/javascript"></script>
    
    <link href="../../Content/jquery-ui-1.8.6.custom.css" rel="stylesheet" type="text/css" />
</asp:Content>
<asp:Content ContentPlaceHolderID="MainContentPlaceHolder" runat="server">
<div id="loading" style="display:none;">Loading ...</div>    
    <div id="main">
    </div>
    <script id="employees-table-tmpl" type="text/html">
     <h1>Employees</h1>
    <table id="employees-table">
        <thead>
            <tr>
                <th style="display:none;"></th>
			    <th>FirstName</th>
			    <th>LastName</th>
			    <th>PhoneExtension</th>
			    <th colspan="3">Action</th>
            </tr>
        </thead>
        <tbody>		
        </tbody>
    </table>
    <p><button id="create-employee">Create</button></p>
    </script>

    <script id="employees-table-row-tmpl" type="text/html">
			<tr>
				<td>${FirstName}</td>
				<td>${LastName}</td>
				<td>${PhoneExtension}</td>
                <td><button id="details" employeeId="${Id}">Details</button></td>
				<td><button id="edit" employeeId="${Id}">Edit</button></td>
				<td><button class="default" id="delete" employeeId="${Id}">Delete</button></td>				
		    </tr>
    </script>

    <script id="employee-form-tmpl" type="text/html">
    <div id="employee-form">
    <ul>
        <form id="employee-form-create">
        <input type="hidden" name="Employee.Id" value="${Id}" />
		<li>		    
            <label for="FirstName">FirstName:</label>				    
			<div id="FirstName">
            <input name="Employee.FirstName" value="${FirstName}" />
			</div>			
		</li>
		<li>
        <label for="LastName">LastName:</label>				
			<div id="LastName">
			<input name="Employee.LastName" value="${LastName}" />
			</div>			
		</li>
		<li>
        <label for="PhoneExtension">PhoneExtension:</label>		    
			<div id="PhoneExtension">
            <input name="Employee.PhoneExtension" value="${PhoneExtension}" />			    
			</div>			
		</li>
		<li>        
			<label for="Employee Territories">Territories:</label>     
            <div>       
            <textarea name="AvailableTerritories" cols="68" rows="3">${TerritoriesString}</textarea>
            </div>
		</li>
	    <li>
            <button id="employee-save">Save</button>
            <button id="employee-cancel" class="default">Cancel</button>
        </li>
        </form>
    </ul>
    </div>
    </script>

    <script id="employee-detail-tmpl" type="text/html">
    <div id="employee-detail">
    <h1>Employee Details</h1>
    <ul>
		<li>
			<label for="Employee_FirstName">FirstName:</label>
            <span id="Employee_FirstName">${FirstName}</span>
		</li>
		<li>
			<label for="Employee_LastName">LastName:</label>
            <span id="Employee_LastName">${LastName}</span>
		</li>
		<li>
			<label for="Employee_PhoneExtension">PhoneExtension:</label>
            <span id="Employee_PhoneExtension">${PhoneExtension}</span>
		</li>
		<li>
			<label for="Employee_Territories">Territories:</label>
            <span id="Employee_Territories">
                <ul>
                {{each Territories}}     
                    <li>${Id} ${Description}</li>
                {{/each}}
                </ul>
            </span>
		</li>
	</ul>
    </div>
    </script>

<script type="text/javascript">
    Northwind.Client.EmployeeRia.main();
</script>   

</asp:Content>