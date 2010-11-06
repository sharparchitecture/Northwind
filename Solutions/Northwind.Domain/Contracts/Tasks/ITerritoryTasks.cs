using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace Northwind.Domain.Contracts.Tasks
{
    public interface ITerritoryTasks
    {
        IList<Territory> GetTerritories();
    }
}
