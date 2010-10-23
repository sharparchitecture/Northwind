namespace Tests.Northwind.Data
{
    using global::Northwind.Domain;

    using NUnit.Framework;

    using SharpArch.Core.PersistenceSupport;
    using SharpArch.Data.NHibernate;
    using SharpArch.Testing.NUnit.NHibernate;

    [TestFixture]
    [Category("DB Tests")]
    public class CategoryRepositoryTests : DatabaseRepositoryTestsBase
    {
        private readonly IRepository<Category> categoryRepository = new Repository<Category>();

        [Test]
        public void CanGetAllCategories()
        {
            var categories = this.categoryRepository.GetAll();

            Assert.That(categories, Is.Not.Null);
            Assert.That(categories, Is.Not.Empty);
        }

        [Test]
        public void CanGetCategoryById()
        {
            var category = this.categoryRepository.Get(1);

            Assert.That(category.CategoryName, Is.EqualTo("Beverages"));
        }
    }
}