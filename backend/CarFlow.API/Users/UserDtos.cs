using System.ComponentModel.DataAnnotations;

namespace CarFlow.API.Users;

public class UserDto
{
    public int UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateUserRequest
{
    [Required, MaxLength(150)]
    public string Name { get; set; } = string.Empty;

    [Required, EmailAddress, MaxLength(200)]
    public string Email { get; set; } = string.Empty;

    [Required, MinLength(6)]
    public string Password { get; set; } = string.Empty;

    // Owner | Vanzari | Junior
    [Required]
    public string Role { get; set; } = "Junior";
}

public class UpdateUserRequest
{
    // Owner | Vanzari | Junior
    [Required]
    public string Role { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;
}
