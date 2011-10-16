<%@ Control Language="C#" Inherits="System.Web.Mvc.ViewUserControl" %>
<%
    if (this.Request.IsAuthenticated)
    {
        %>
        Welcome <b><%=this.Html.Encode(this.Page.User.Identity.Name)%></b>!
        [ <%=this.Html.ActionLink("Log Off", "LogOff", "Account")%> ]
<%
    }
    else
    {
        %> 
        [ <%=this.Html.ActionLink("Log On", "LogOn", "Account")%> ]
<%
    }
%>
