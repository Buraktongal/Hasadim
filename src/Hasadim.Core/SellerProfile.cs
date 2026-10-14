namespace Hasadim.Core;
public enum AccountKind { Individual, Business }
public enum SellerActivity { Producer, Buyer, Trader, Cooperative, Other }
public class SellerProfile
{
 public Guid UserId {get;set;}
 public string DisplayName {get;set;}="";
 public string AccountType {get;set;}="Individual";
 public string Activity {get;set;}="Producer";
 public string BusinessName {get;set;}="";
 public string City {get;set;}="";
 public string District {get;set;}="";
 public string About {get;set;}="";
 public string Phone {get;set;}="";
 public bool ShowPhone {get;set;}=true;
 public string? PhotoFile {get;set;}
 public DateTime? CreatedAt {get;set;}
 public string Email {get;set;}="";
 public bool EmailConfirmed {get;set;}
 public int ActiveListingCount {get;set;}
 public byte[] Version {get;set;}=[];
}
