using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace monaco_colab
{
    public class Program
    {
        public static void Main(string[] args)
        {
            CreateHostBuilder(args).Build().Run();
        }

        public static IHostBuilder CreateHostBuilder(string[] args) =>
            Host.CreateDefaultBuilder(args)
                .ConfigureWebHostDefaults(webBuilder =>
                {
                    if (args.Any(x => x == "--dev"))
                    {
                        webBuilder.UseEnvironment(Microsoft.Extensions.Hosting.Environments.Development);
                    }
                    if (!args.Any(x => x == "--urls"))
                    {
                        webBuilder.UseUrls("http://localhost:5000");
                    }
                    webBuilder.UseStartup<Startup>();
                });
    }
}
