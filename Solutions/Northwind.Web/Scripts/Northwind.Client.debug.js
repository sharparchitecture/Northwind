//! Northwind.Client.debug.js
//

(function() {
function executeScript() {

Type.registerNamespace('Northwind.Client');

////////////////////////////////////////////////////////////////////////////////
// Northwind.Client.EmployeeModule

Northwind.Client.EmployeeModule = function Northwind_Client_EmployeeModule() {
    /// <field name="_employeeViewModel" type="Northwind.Client.Models.EmployeeViewModel">
    /// </field>
    /// <field name="_selectedEmployee" type="Northwind.Client.Models.Employee">
    /// </field>
    this._initialize();
    this._registerClickHandlers();
}
Northwind.Client.EmployeeModule.prototype = {
    _employeeViewModel: null,
    _selectedEmployee: null,
    
    get_selectedEmployee: function Northwind_Client_EmployeeModule$get_selectedEmployee() {
        /// <value type="Northwind.Client.Models.Employee"></value>
        return this._selectedEmployee;
    },
    
    territorySuggestions: function Northwind_Client_EmployeeModule$territorySuggestions(eventHandler) {
        /// <param name="eventHandler" type="jQueryEvent">
        /// </param>
        eventHandler.currentTarget.firstChild.nodeValue.split(',');
    },
    
    _registerClickHandlers: function Northwind_Client_EmployeeModule$_registerClickHandlers() {
        $('#create-employee').live('click', ss.Delegate.create(this, this._create));
        $('#employee-save').live('click', ss.Delegate.create(this, this._create));
        $('#edit').live('click', ss.Delegate.create(this, this._edit));
        $('#delete').live('click', ss.Delegate.create(this, this._remove));
        $('#details').live('click', ss.Delegate.create(this, this._details));
        $('#AvailableTerritories').live('keyup', ss.Delegate.create(this, this.territorySuggestions));
    },
    
    _initialize: function Northwind_Client_EmployeeModule$_initialize() {
        $('#loading').show();
        $.getJSON('EmployeeRia/GetEmployeeFormViewModel', ss.Delegate.create(this, function(response) {
            var viewModel = response;
            this._employeeViewModel = viewModel;
            this._renderTable(viewModel);
        }));
    },
    
    _create: function Northwind_Client_EmployeeModule$_create(eventHandler) {
        /// <param name="eventHandler" type="jQueryEvent">
        /// </param>
        eventHandler.preventDefault();
        if (eventHandler.currentTarget.id === 'create-employee') {
            var employee = new Northwind.Client.Models.Employee();
            var employeeService = new Northwind.Client.Models.EmployeeService();
            employeeService.displayForm(employee);
            return;
        }
        $('.error-message').remove();
        $('#employee-save').attr('disabled', 'true');
        $.post('EmployeeRia/Edit', $('#employee-form-create').serialize(), ss.Delegate.create(this, function(response) {
            var employee = response;
            if (employee.Valid) {
                $('#main').empty();
                $('#employee-form').remove();
                this._initialize();
                return;
            }
            var employeeService = new Northwind.Client.Models.EmployeeService();
            employeeService.showValidationResults(employee);
            $('#employee-save').attr('disabled', 'false');
        }));
    },
    
    _edit: function Northwind_Client_EmployeeModule$_edit(eventHandler) {
        /// <param name="eventHandler" type="jQueryEvent">
        /// </param>
        this._getCurrentEmployeeFromRow(eventHandler.currentTarget.getAttribute('employeeId').toString());
        var employeeService = new Northwind.Client.Models.EmployeeService();
        employeeService.displayForm(this.get_selectedEmployee());
    },
    
    _remove: function Northwind_Client_EmployeeModule$_remove(eventHandler) {
        /// <param name="eventHandler" type="jQueryEvent">
        /// </param>
        this._getCurrentEmployeeFromRow(eventHandler.currentTarget.getAttribute('employeeId').toString());
        $.post('EmployeeRia/Delete/' + this.get_selectedEmployee().Id, ss.Delegate.create(this, function(response) {
            var employees = response;
            this._employeeViewModel.Employees = employees;
            this._renderTable(this._employeeViewModel);
        }));
    },
    
    _details: function Northwind_Client_EmployeeModule$_details(eventHandler) {
        /// <param name="eventHandler" type="jQueryEvent">
        /// </param>
        this._getCurrentEmployeeFromRow(eventHandler.currentTarget.getAttribute('employeeId').toString());
        var employeeDetails = $.tmpl($('#employee-detail-tmpl').html(), this.get_selectedEmployee());
        $('#main').append(employeeDetails);
        $('#employee-detail').dialog({minWidth:500,close: function(event, ui){$(this).dialog('destroy').remove();}});
    },
    
    _getCurrentEmployeeFromRow: function Northwind_Client_EmployeeModule$_getCurrentEmployeeFromRow(id) {
        /// <param name="id" type="String">
        /// </param>
        var $enum1 = ss.IEnumerator.getEnumerator(this._employeeViewModel.Employees);
        while ($enum1.moveNext()) {
            var employee = $enum1.get_current();
            if (employee.Id.toString() === id.toString()) {
                employee.TerritoriesString = this._territoriestoCSV(employee.Territories);
                this._selectedEmployee = employee;
                break;
            }
        }
    },
    
    _territoriestoCSV: function Northwind_Client_EmployeeModule$_territoriestoCSV(territories) {
        /// <param name="territories" type="Array" elementType="Object">
        /// </param>
        /// <returns type="String"></returns>
        var territoriesCommaString = new String();
        for (var index = 0; index < territories.length; index++) {
            var territory = territories[index];
            if (index === territories.length - 1) {
                territoriesCommaString = territoriesCommaString + territory.Description.trim();
            }
            else {
                territoriesCommaString = territoriesCommaString + territory.Description.trim() + ', ';
            }
        }
        return territoriesCommaString;
    },
    
    _renderTable: function Northwind_Client_EmployeeModule$_renderTable(employeeViewModel) {
        /// <param name="employeeViewModel" type="Northwind.Client.Models.EmployeeViewModel">
        /// </param>
        if ((employeeViewModel.Employees.length === 0 & employeeViewModel.AvailableTerritories.length === 0) === 1) {
            return;
        }
        $('#main').empty();
        this._attachTemplates(employeeViewModel);
        $('#loading').hide();
    },
    
    _attachTemplates: function Northwind_Client_EmployeeModule$_attachTemplates(employeeViewModel) {
        /// <param name="employeeViewModel" type="Northwind.Client.Models.EmployeeViewModel">
        /// </param>
        var slug = new Boolean();
        $('#main').empty();
        var employeeTable = $.tmpl($('#employees-table-tmpl').html(), slug);
        $('#main').append(employeeTable);
        var $enum1 = ss.IEnumerator.getEnumerator(this._employeeViewModel.Employees);
        while ($enum1.moveNext()) {
            var employee = $enum1.get_current();
            var employeeRow = $.tmpl($('#employees-table-row-tmpl').html(), employee);
            $('#employees-table tbody').append(employeeRow);
        }
    }
}


////////////////////////////////////////////////////////////////////////////////
// Northwind.Client.EmployeeRia

Northwind.Client.EmployeeRia = function Northwind_Client_EmployeeRia() {
}
Northwind.Client.EmployeeRia.main = function Northwind_Client_EmployeeRia$main() {
    var employeeModule = new Northwind.Client.EmployeeModule();
}


Type.registerNamespace('Northwind.Client.Models');

////////////////////////////////////////////////////////////////////////////////
// Northwind.Client.Models.IEmployeeService

Northwind.Client.Models.IEmployeeService = function() { 
};
Northwind.Client.Models.IEmployeeService.prototype = {
    displayForm : null,
    showValidationResults : null
}
Northwind.Client.Models.IEmployeeService.registerInterface('Northwind.Client.Models.IEmployeeService');


////////////////////////////////////////////////////////////////////////////////
// Northwind.Client.Models.Employee

Northwind.Client.Models.Employee = function Northwind_Client_Models_Employee() {
    /// <field name="FirstName" type="String">
    /// </field>
    /// <field name="FullName" type="String">
    /// </field>
    /// <field name="LastName" type="String">
    /// </field>
    /// <field name="PhoneExtension" type="Number" integer="true">
    /// </field>
    /// <field name="Territories" type="Array" elementType="Object">
    /// </field>
    /// <field name="TerritoriesString" type="String">
    /// </field>
    Northwind.Client.Models.Employee.initializeBase(this);
    this.Id = 0;
}
Northwind.Client.Models.Employee.prototype = {
    FirstName: null,
    FullName: null,
    LastName: null,
    PhoneExtension: 0,
    Territories: null,
    TerritoriesString: null,
    
    getEnumerator: function Northwind_Client_Models_Employee$getEnumerator() {
        /// <returns type="ss.IEnumerator"></returns>
        return (Type.safeCast(this.Territories, ss.IEnumerable)).getEnumerator();
    }
}


////////////////////////////////////////////////////////////////////////////////
// Northwind.Client.Models.EmployeeService

Northwind.Client.Models.EmployeeService = function Northwind_Client_Models_EmployeeService() {
}
Northwind.Client.Models.EmployeeService.prototype = {
    
    displayForm: function Northwind_Client_Models_EmployeeService$displayForm(employee) {
        /// <param name="employee" type="Northwind.Client.Models.Employee">
        /// </param>
        var employeeForm = $.tmpl($('#employee-form-tmpl').html(), employee);
        $('#main').append(employeeForm);
        $('#employee-form').dialog({minWidth:500,close: function(event, ui){$(this).dialog('destroy').remove();}});
    },
    
    showValidationResults: function Northwind_Client_Models_EmployeeService$showValidationResults(employee) {
        /// <param name="employee" type="Northwind.Client.Models.Employee">
        /// </param>
        var $enum1 = ss.IEnumerator.getEnumerator(employee.ValidationResultsJson);
        while ($enum1.moveNext()) {
            var validationResult = $enum1.get_current();
            if (validationResult.PropertyName === 'FirstName') {
                $('#FirstName').append('<div class=\"error-message\">' + validationResult.Message + '</div>');
            }
            if (validationResult.PropertyName === 'LastName') {
                $('#LastName').append('<div class=\"error-message\">' + validationResult.Message + '</div>');
            }
            if (validationResult.PropertyName === 'PhoneExtension') {
                $('#PhoneExtension').append('<div class=\"error-message\">' + validationResult.Message + '</div>');
            }
        }
    }
}


////////////////////////////////////////////////////////////////////////////////
// Northwind.Client.Models.EmployeeViewModel

Northwind.Client.Models.EmployeeViewModel = function Northwind_Client_Models_EmployeeViewModel() {
    /// <field name="Employees" type="Array" elementType="Employee">
    /// </field>
    /// <field name="AvailableTerritories" type="Array" elementType="Object">
    /// </field>
}
Northwind.Client.Models.EmployeeViewModel.prototype = {
    Employees: null,
    AvailableTerritories: null
}


Northwind.Client.EmployeeModule.registerClass('Northwind.Client.EmployeeModule');
Northwind.Client.EmployeeRia.registerClass('Northwind.Client.EmployeeRia');
Northwind.Client.Models.Employee.registerClass('Northwind.Client.Models.Employee', Object);
Northwind.Client.Models.EmployeeService.registerClass('Northwind.Client.Models.EmployeeService', null, Northwind.Client.Models.IEmployeeService);
Northwind.Client.Models.EmployeeViewModel.registerClass('Northwind.Client.Models.EmployeeViewModel');

}
ss.loader.registerScript('Northwind.Client', [], executeScript);
})();
