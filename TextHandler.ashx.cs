using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace TitleVI
{
	/// <summary>
	/// Summary description for TextHandler
	/// </summary>
	public class TextHandler : IHttpHandler
	{

		public void ProcessRequest(HttpContext context)
		{

			string data = context.Request.Params["data"];

			context.Response.ContentType = "text/plain";
			context.Response.Write(data);
		}

		public bool IsReusable
		{
			get
			{
				return false;
			}
		}
	}
}