// Territory.cs
//

using System;
using System.Collections;
using System.Html;
using System.Runtime.CompilerServices;
using jQueryApi;
using jQueryApi.Templating;

namespace Northwind.Client.Models
{
    public class Territory : EntityWithAssignedId
    {
        [PreserveCase] public string Description;

        [PreserveCase] public Region RegionBelongingTo;
    }

    public interface ITerritoryService
    {
        void TerritorySuggestions(jQueryEvent eventHandler);

        void SetViewModel(EmployeeViewModel viewModel);

        string TerritoriestoCSV(Territory[] territories);
    }

    public sealed class TerritoryService : ITerritoryService
    {
        public EmployeeViewModel EmployeeViewModel;

        public void SetViewModel(EmployeeViewModel viewModel) 
        {
            this.EmployeeViewModel = viewModel;
        }

        public void TerritorySuggestions(jQueryEvent eventHandler) 
        {
            eventHandler.PreventDefault();
            jQuery.Select("#suggestions").Empty();
            InputElement territoryInput = (InputElement)eventHandler.CurrentTarget;

            string[] territoryArray = territoryInput.Value.Split(',');

            for (int index = 0; index < this.EmployeeViewModel.AvailableTerritories.Length; index++) 
            {
                // Only show the first 3 results in the UI
                if (index > 2) 
                {
                    break;
                }

                Territory availableTerritory = this.EmployeeViewModel.AvailableTerritories[index];
                RegularExpression r = new RegularExpression(territoryArray[territoryArray.Length - 1].Trim(), "i");

                if (availableTerritory.Description.Search(r) != -1) 
                {
                    jQuery.Select("#suggestions").Append(
                        jQuery.FromHtml("<div style=\"margin-left:7px;\">" + availableTerritory.Description + "</div>"));
                }
            }
        }

        public string TerritoriestoCSV(Territory[] territories)
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
    }
}
