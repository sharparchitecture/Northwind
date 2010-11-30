// Territory.cs
//

using System;
using System.Collections;
using System.Runtime.CompilerServices;

namespace Northwind.Client.Models
{
    [Imported]
    [IgnoreNamespace]
    [ScriptName("Object")]
    public class Territory : EntityWithAssignedId
    {
        [PreserveCase] public string Description;

        [PreserveCase] public Region RegionBelongingTo;
    }
}
