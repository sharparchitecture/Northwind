// EmployeeController.cs
//

using System;
using System.Collections;
using System.Html;
using jQueryApi;
using jQueryApi.Templating;
using Northwind.Client.Models;

namespace Northwind.Client
{
    public class EmployeeModule
    {
        private EmployeeViewModel employeeViewModel;

        private Employee selectedEmployee;

        private IEmployeeService employeeService;

        public EmployeeModule() 
        {
            this.Initialize();
            this.RegisterClickHandlers();

            this.employeeService = new EmployeeService();
        }

        public Employee SelectedEmployee 
        {
            get 
            {
                return this.selectedEmployee;
            }
        }

        public void TerritorySuggestions(jQueryEvent eventHandler) 
        {
            jQuery.Select("#suggestions").Empty();
            InputElement territoryInput = (InputElement) eventHandler.CurrentTarget;

            string[] territoryArray = territoryInput.Value.Split(',');

            for (int index = 0; index < this.employeeViewModel.AvailableTerritories.Length; index++) 
            {
                if (index > 2) 
                {
                    //jQuery.Select("#suggestions").Append(
                    //    jQuery.FromHtml("<div style=\"margin-left:7px;\">" + (this.employeeViewModel.AvailableTerritories.Length - index) + " more not showing</div>"));
                    break;
                }

                Territory availableTerritory = this.employeeViewModel.AvailableTerritories[index];
                RegularExpression r = new RegularExpression(territoryArray[territoryArray.Length - 1].Trim(), "i");

                if (availableTerritory.Description.Search(r) != -1) 
                {
                    jQuery.Select("#suggestions").Append(
                        jQuery.FromHtml("<div style=\"margin-left:7px;\">" + availableTerritory.Description + "</div>"));
                }
            }
        }

        private void RegisterClickHandlers()
        {
            jQuery.Select("#create-employee").Live("click", this.Create);
            jQuery.Select("#employee-save").Live("click", this.Create);
            jQuery.Select("#edit").Live("click", this.Edit);
            jQuery.Select("#delete").Live("click", this.Remove);
            jQuery.Select("#details").Live("click", this.Details);
            jQuery.Select("#TerritoriesAutoSuggest").Live("keyup", this.TerritorySuggestions);
        }

        private void Initialize()
        {
            jQuery.Select("#loading").Show();

            jQuery.GetJson(
                            "EmployeeRia/GetEmployeeFormViewModel", 
                            delegate(object response)
                                {
                                    EmployeeViewModel viewModel = (EmployeeViewModel)response;
                                    this.employeeViewModel = viewModel;
                                    this.RenderTable(viewModel);
                                });
        }

        private void Create(jQueryEvent eventHandler)
        {
            eventHandler.PreventDefault();

            if (eventHandler.CurrentTarget.ID == "create-employee")
            {
                Employee employee = new Employee();
                IEmployeeService employeeService = new EmployeeService();
                employeeService.DisplayForm(employee);
                return;
            }

            jQuery.Select(".error-message").Remove();
            jQuery.Select("#employee-save").Attribute("disabled", "true");
            jQuery.Post(
                        "EmployeeRia/Edit", 
                        jQuery.Select("#employee-form-create").Serialize(), 
                        delegate(object response) 
                        {
                            Employee employee = (Employee)response;

                            if (employee.Valid)
                            {
                                jQuery.Select("#main").Empty();
                                jQuery.Select("#employee-form").Remove();
                                
                                // Ideally you'd have an update function
                                // that simply takes the return Employee and adds
                                // it to the table instead of doing a roundtrip.
                                this.Initialize();
                                return;
                            }

                            this.employeeService.ShowValidationResults(employee);
            });
        }

        private void Edit(jQueryEvent eventHandler) 
        {
            this.GetCurrentEmployeeFromRow(eventHandler.CurrentTarget.GetAttribute("employeeId").ToString());

            this.employeeService.DisplayForm(this.SelectedEmployee);
        }

        // If speed is a concern and it is not imperative that the UI be in sync, you could much
        // more simply remove the element from the DOM, or even better do the quick UI removal
        // and if the server replies with error message, display the error message. For simplicity's
        // sake, I'm simply blocking the UI until I receive a response from the server.
        private void Remove(jQueryEvent eventHandler) 
        {
            this.GetCurrentEmployeeFromRow(eventHandler.CurrentTarget.GetAttribute("employeeId").ToString());

            jQuery.Post(
                        "EmployeeRia/Delete/" +
                        this.SelectedEmployee.Id,
                        delegate(object response)
                        {
                            Employee[] employees = (Employee[])response;
                            this.employeeViewModel.Employees = employees;
                            this.RenderTable(this.employeeViewModel);
                        });
        }

        // I try to avoid Script.Literal() when possible, but nonetheless
        // this is a demonstration on how to get you out of those places where
        // C# -> Javascript compilation falls short, not that you couldn't implement this
        // paticular example in C# easily.
        private void Details(jQueryEvent eventHandler) 
        {
            this.GetCurrentEmployeeFromRow(eventHandler.CurrentTarget.GetAttribute("employeeId").ToString());

            jQueryObject employeeDetails = jQueryTemplating.RenderTemplate(jQuery.Select("#employee-detail-tmpl").GetHtml(), this.SelectedEmployee);

            jQuery.Select("#main").Append(employeeDetails);
            jQuery.Select("#employee-detail").Cast<Dialogs>()
                                             .Dialog(Script.Literal(@"{minWidth:500,close: function(event, ui){$(this).dialog('destroy').remove();}}"));
            
        }

        private void GetCurrentEmployeeFromRow(string id) 
        {
            foreach (Employee employee in this.employeeViewModel.Employees)
            {
                if (employee.Id.ToString() == id.ToString())
                {
                    employee.TerritoriesString = this.TerritoriestoCSV(employee.Territories);
                    this.selectedEmployee = employee;
                    break;
                }
            }
        }

        private string TerritoriestoCSV(Territory[] territories) 
        {
            string territoriesCommaString = new string();

            for (int index = 0; index < territories.Length; index++) 
            {
                Territory territory = territories[index];
                if (index == territories.Length - 1) 
                {
                    territoriesCommaString = territoriesCommaString + territory.Description.Trim();
                }
                else 
                {
                    territoriesCommaString = territoriesCommaString + territory.Description.Trim() + ", ";
                }
            }

            return territoriesCommaString;
        }

        // Obviously if you had a large table with a lot of elements, it would
        // make more sense to only update the rows you need. Here, anytime the
        // data changes, the table is wiped out and re-rendered.
        private void RenderTable(EmployeeViewModel employeeViewModel) 
        {
            if (employeeViewModel.Employees.Length == 0 & employeeViewModel.AvailableTerritories.Length == 0) 
            {
                return;
            }

            jQuery.Select("#main").Empty();

            this.AttachTemplates(employeeViewModel);

            jQuery.Select("#loading").Hide();
        }

        private void AttachTemplates(EmployeeViewModel employeeViewModel) 
        {
            // jQueryTmpl used to/still does fail when you don't throw
            // a slug into it. I've grown into the habit of always throwing in
            // a slug. It will also fail if you use a template without any
            // DOM elements, you at least need a div, "<div>${Id}</div>"
            bool slug = new bool();
            jQuery.Select("#main").Empty();
            jQueryObject employeeTable = jQueryTemplating.RenderTemplate(jQuery.Select("#employees-table-tmpl").GetHtml(), slug);
            jQuery.Select("#main").Append(employeeTable);

            foreach (Employee employee in this.employeeViewModel.Employees) {
                jQueryObject employeeRow = jQueryTemplating.RenderTemplate(jQuery.Select("#employees-table-row-tmpl").GetHtml(), employee);
                jQuery.Select("#employees-table tbody").Append(employeeRow);
            }
        }
    }
}
