using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Northwind.Domain;
using Northwind.Domain.Contracts.Tasks;
using Northwind.Domain.Organization;
using SharpArch.Core;
using SharpArch.Core.PersistenceSupport;

namespace Northwind.Tasks
{
    public class TerritoryTasks : ITerritoryTasks
    {
        #region Fields

        private readonly IRepository<Territory> territoryRepository;

        #endregion

        public TerritoryTasks(IRepository<Territory> territoryRepository) {
            this.territoryRepository = territoryRepository;
        }

        public IList<Territory> GetTerritories() {
            var territories = territoryRepository.GetAll();
            return territories;
        }
    }
}
